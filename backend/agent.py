import os
import time
import logging
from typing import TypedDict, Optional, Literal
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from backend.database import SessionLocal
from backend.models import Product, Category, Cart, CartItem, Order, OrderItem

logger = logging.getLogger("multi_agent")

class AgentState(TypedDict):
    request_id: str
    user_id: int
    is_admin: bool
    user_message: str
    intent: Optional[Literal["product_search", "cart", "order", "clarify", "unsafe"]]
    final_response: Optional[str]
    error: Optional[str]

class RouteIntent(BaseModel):
    intent: Literal["product_search", "cart", "order", "clarify", "unsafe"] = Field(
        description="The routed intent based on the user request. Use 'clarify' if unclear, 'unsafe' if malicious."
    )

# --- PRODUCT TOOLS ---

@tool
def get_categories():
    """Retrieve all available product categories."""
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        if not categories:
            return "No categories found."
        return [c.name for c in categories]
    finally:
        db.close()

@tool
def search_products(query: str = "", category_name: str = "", min_price: float = 0.0, max_price: float = 99999.0, sort_by: str = ""):
    """Search for products by name, category, and price range. sort_by can be 'price_asc' or 'price_desc'."""
    db = SessionLocal()
    try:
        q = db.query(Product)
        if query:
            q = q.filter(Product.name.ilike(f"%{query}%"))
        if category_name:
            q = q.join(Category).filter(Category.name.ilike(f"%{category_name}%"))
        q = q.filter(Product.price >= min_price, Product.price <= max_price)
        
        if sort_by == "price_asc":
            q = q.order_by(Product.price.asc())
        elif sort_by == "price_desc":
            q = q.order_by(Product.price.desc())
            
        products = q.limit(20).all()
        if not products:
            return "No products found matching the criteria."
            
        result = []
        for p in products:
            cat_name = p.category.name if p.category else "Uncategorized"
            result.append(f"ID {p.id}: {p.name} - ${p.price} - Stock: {p.stock} - Category: {cat_name}")
        return "\n".join(result)
    finally:
        db.close()

@tool
def get_product_details(product_id: int):
    """Get detailed information about a specific product including description and stock."""
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            return f"Product with ID {product_id} not found."
        cat_name = p.category.name if p.category else "Uncategorized"
        return f"ID {p.id}: {p.name}\nPrice: ${p.price}\nStock: {p.stock}\nCategory: {cat_name}\nDescription: {p.description}"
    finally:
        db.close()

# --- NODES ---

def orchestrator_node(state: AgentState):
    """The orchestrator receives the user's message and routes it to the correct specialist."""
    request_id = state.get("request_id")
    start_time = time.time()
    
    # If returning from a specialist with an error
    if state.get("error"):
        logger.warning(f"[{request_id}] [Orchestrator] Error returned from specialist: {state.get('error')}. Time: {time.time()-start_time:.3f}s")
        return {"final_response": "I'm sorry, there was a technical issue while processing your request. Please try again later."}
        
    # If returning from a specialist with a successful response
    if state.get("final_response"):
        logger.info(f"[{request_id}] [Orchestrator] Final response delivered. Time: {time.time()-start_time:.3f}s")
        return {"final_response": state["final_response"]}
        
    msg = state.get("user_message", "").lower()
    
    # Input length validation
    if len(msg) > 500:
        logger.warning(f"[{request_id}] [Orchestrator] Request too long (len={len(msg)}). Refusing.")
        return {"intent": "unsafe", "final_response": "Your request is too long. Please summarize your query."}
    
    # Basic Safety Check (Prompt Injection & Malicious intent)
    if "drop " in msg or "delete from" in msg or "ignore instructions" in msg or "bypass" in msg or "system prompt" in msg:
        logger.warning(f"[{request_id}] [Orchestrator] Malicious intent detected. Refusing.")
        return {"intent": "unsafe", "final_response": "I cannot fulfill this request safely."}
    
    # Attempt LLM Routing
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0,
            api_key=api_key
            )
            structured_llm = llm.with_structured_output(RouteIntent)
            prompt = f"""You are an Orchestrator Agent for an e-commerce platform.
Your job is to route the user's request to the correct specialist agent.
Rules:
- Product, category, search, filter or stock -> 'product_search'
- View/add/change/remove cart -> 'cart'
- Order history, order details, checkout/order actions or admin order actions -> 'order'
- If malicious or harmful -> 'unsafe'
- If unclear or unrelated to the store -> 'clarify'

Do not guess. If unclear, choose 'clarify'.

User request: {msg}"""
            
            result = structured_llm.invoke(prompt)
            intent = result.intent
            logger.info(f"[{request_id}] [Orchestrator] Intent parsed: {intent}. Time: {time.time()-start_time:.3f}s")
            
            if intent == "clarify":
                return {"intent": "clarify", "final_response": "Could you clarify if you need help with products, your cart, or orders?"}
            elif intent == "unsafe":
                return {"intent": "unsafe", "final_response": "I cannot fulfill this request safely."}
            return {"intent": intent}
        except Exception as e:
            logger.error(f"[{request_id}] [Orchestrator] LLM routing failed: {type(e).__name__}")
            
    # Fallback basic routing
    fallback_intent = "clarify"
    if "cart" in msg or "add" in msg or "remove" in msg:
        fallback_intent = "cart"
    elif "order" in msg or "status" in msg or "checkout" in msg:
        fallback_intent = "order"
    elif "product" in msg or "shoe" in msg or "search" in msg or "stock" in msg:
        fallback_intent = "product_search"
        
    logger.info(f"[{request_id}] [Orchestrator] Intent parsed (Fallback): {fallback_intent}. Time: {time.time()-start_time:.3f}s")
    if fallback_intent == "clarify":
        return {"intent": "clarify", "final_response": "Could you clarify if you need help with products, your cart, or orders?"}
    return {"intent": fallback_intent}

def product_search_node(state: AgentState):
    start_time = time.time()
    request_id = state.get("request_id")
    logger.info(f"[{request_id}] [ProductAgent] Started")
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning(f"[{request_id}] [ProductAgent] Missing API Key.")
        return {"final_response": "I see you are looking for a product. Please ensure GROQ_API_KEY is set to search the catalog."}
        
    llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0, api_key=api_key)
    tools = [get_categories, search_products, get_product_details]
    llm_with_tools = llm.bind_tools(tools)
    
    messages = [
        SystemMessage(content="You are a helpful Product Search Agent. Use the provided tools to answer the user's queries about products, categories, filters, sorting, and stock. Do not guess information. Only use read-only queries. Do not try to access cart or order data. If the tool returns no data, inform the user politely."),
        HumanMessage(content=state.get("user_message", ""))
    ]
    
    try:
        for i in range(3):
            response = llm_with_tools.invoke(messages)
            messages.append(response)
            
            if not response.tool_calls:
                logger.info(f"[{request_id}] [ProductAgent] Finished in {time.time()-start_time:.3f}s (Retries: {i})")
                return {"final_response": response.content}
                
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                start_tool = time.time()
                tool_result = "Tool not found"
                if tool_name == "get_categories":
                    tool_result = get_categories.invoke(tool_args)
                elif tool_name == "search_products":
                    tool_result = search_products.invoke(tool_args)
                elif tool_name == "get_product_details":
                    tool_result = get_product_details.invoke(tool_args)
                
                tool_time = time.time() - start_tool
                logger.info(f"[{request_id}] [Database] [ProductAgent] Tool '{tool_name}' executed in {tool_time:.3f}s")
                messages.append(ToolMessage(tool_call_id=tool_call["id"], name=tool_name, content=str(tool_result)))
                
        logger.warning(f"[{request_id}] [ProductAgent] Timeout after {time.time()-start_time:.3f}s")
        return {"error": "timeout"}
    except Exception as e:
        logger.error(f"[{request_id}] [ProductAgent] Failed: {type(e).__name__}")
        return {"error": "specialist_failed"}

def cart_node(state: AgentState):
    start_time = time.time()
    request_id = state.get("request_id")
    user_id = state.get("user_id")
    logger.info(f"[{request_id}] [CartAgent] Started for User={user_id}")
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning(f"[{request_id}] [CartAgent] Missing API Key.")
        return {"final_response": "I see you need help with your cart. Please ensure GROQ_API_KEY is set."}
        
    @tool
    def view_cart():
        """View the current user's cart including items, quantities, and total cost."""
        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart or not cart.items:
                return "Your cart is empty."
            
            result = []
            total = 0.0
            for item in cart.items:
                subtotal = item.quantity * item.product.price
                total += subtotal
                result.append(f"Product ID: {item.product.id}, Name: {item.product.name}, Quantity: {item.quantity}, Price: ${item.product.price:.2f}, Subtotal: ${subtotal:.2f}")
            
            result.append(f"Total Cart Value: ${total:.2f}")
            return "\n".join(result)
        finally:
            db.close()

    @tool
    def add_to_cart(product_id: int, quantity: int = 1):
        """Add a specific quantity of a product to the cart. Provide product_id and quantity."""
        if quantity <= 0:
            return "Quantity must be greater than 0."
            
        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                return f"Product with ID {product_id} not found."
                
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart:
                cart = Cart(user_id=user_id)
                db.add(cart)
                db.commit()
                db.refresh(cart)
                
            cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
            
            new_quantity = quantity
            if cart_item:
                new_quantity += cart_item.quantity
                
            if new_quantity > product.stock:
                return f"Cannot add to cart. Only {product.stock} items in stock (You already have {cart_item.quantity if cart_item else 0} in cart)."
                
            if cart_item:
                cart_item.quantity = new_quantity
            else:
                cart_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=new_quantity)
                db.add(cart_item)
                
            db.commit()
            return f"Successfully added {quantity} of {product.name} to cart. New total quantity: {new_quantity}."
        finally:
            db.close()

    @tool
    def update_cart_quantity(product_id: int, quantity: int):
        """Update the exact quantity of a product already in the cart. Use this to change quantity or set to 0 to remove."""
        if quantity < 0:
            return "Quantity cannot be negative."
            
        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart:
                return "Your cart is empty."
                
            cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
            if not cart_item:
                return f"Product ID {product_id} is not in your cart."
                
            if quantity == 0:
                db.delete(cart_item)
                db.commit()
                return f"Removed product ID {product_id} from cart."
                
            product = db.query(Product).filter(Product.id == product_id).first()
            if quantity > product.stock:
                return f"Cannot update quantity. Only {product.stock} items in stock."
                
            cart_item.quantity = quantity
            db.commit()
            return f"Successfully updated quantity of {product.name} to {quantity}."
        finally:
            db.close()

    @tool
    def remove_from_cart(product_id: int):
        """Remove a product completely from the cart."""
        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart:
                return "Your cart is empty."
                
            cart_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).first()
            if not cart_item:
                return f"Product ID {product_id} is not in your cart."
                
            db.delete(cart_item)
            db.commit()
            return f"Successfully removed product ID {product_id} from cart."
        finally:
            db.close()

    llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0, api_key=api_key)
    tools = [view_cart, add_to_cart, update_cart_quantity, remove_from_cart]
    llm_with_tools = llm.bind_tools(tools)
    
    messages = [
        SystemMessage(content="You are a helpful Cart Agent. Use the provided tools to manage the user's cart. You can ONLY modify the current user's cart. Do not try to access orders or other users' data. If an action fails due to stock limits, explain it clearly to the user."),
        HumanMessage(content=state.get("user_message", ""))
    ]
    
    try:
        for i in range(3):
            response = llm_with_tools.invoke(messages)
            messages.append(response)
            
            if not response.tool_calls:
                logger.info(f"[{request_id}] [CartAgent] Finished in {time.time()-start_time:.3f}s (Retries: {i})")
                return {"final_response": response.content}
                
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                start_tool = time.time()
                tool_result = "Tool not found"
                if tool_name == "view_cart":
                    tool_result = view_cart.invoke(tool_args)
                elif tool_name == "add_to_cart":
                    tool_result = add_to_cart.invoke(tool_args)
                elif tool_name == "update_cart_quantity":
                    tool_result = update_cart_quantity.invoke(tool_args)
                elif tool_name == "remove_from_cart":
                    tool_result = remove_from_cart.invoke(tool_args)
                    
                tool_time = time.time() - start_tool
                logger.info(f"[{request_id}] [Database] [CartAgent] Tool '{tool_name}' executed in {tool_time:.3f}s")
                messages.append(ToolMessage(tool_call_id=tool_call["id"], name=tool_name, content=str(tool_result)))
                
        logger.warning(f"[{request_id}] [CartAgent] Timeout after {time.time()-start_time:.3f}s")
        return {"error": "timeout"}
    except Exception as e:
        logger.error(f"[{request_id}] [CartAgent] Failed: {type(e).__name__}")
        return {"error": "specialist_failed"}

def order_node(state: AgentState):
    start_time = time.time()
    request_id = state.get("request_id")
    user_id = state.get("user_id")
    is_admin = state.get("is_admin", False)
    logger.info(f"[{request_id}] [OrderAgent] Started for User={user_id}, Admin={is_admin}")
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning(f"[{request_id}] [OrderAgent] Missing API Key.")
        return {"final_response": "I see you need help with orders. Please ensure GROQ_API_KEY is set."}
        
    @tool
    def checkout_cart(delivery_address: str):
        """Checkout the current cart to create a new order."""
        db = SessionLocal()
        try:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
            if not cart or not cart.items:
                return "Your cart is empty. Cannot checkout."
            
            # Stock check and price calculation
            total_price = 0.0
            order_items_data = []
            for item in cart.items:
                if item.quantity > item.product.stock:
                    return f"Checkout failed: Insufficient stock for {item.product.name}."
                total_price += item.quantity * item.product.price
                order_items_data.append({
                    "product": item.product,
                    "quantity": item.quantity,
                    "price_at_purchase": item.product.price
                })
            
            # Create order
            new_order = Order(user_id=user_id, total_price=total_price, status="Pending", delivery_address=delivery_address)
            db.add(new_order)
            db.flush() # Get order ID
            
            for item_data in order_items_data:
                product = item_data["product"]
                product.stock -= item_data["quantity"] # Deduct stock
                order_item = OrderItem(
                    order_id=new_order.id,
                    product_id=product.id,
                    quantity=item_data["quantity"],
                    price_at_purchase=item_data["price_at_purchase"]
                )
                db.add(order_item)
            
            # Clear cart items
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
            
            db.commit()
            return f"Order #{new_order.id} placed successfully! Total: ${total_price:.2f}. Status: Pending."
        except Exception as e:
            db.rollback()
            return f"An error occurred during checkout: {str(e)}"
        finally:
            db.close()

    @tool
    def get_order_history(target_user_id: Optional[int] = None):
        """View order history. Admins can provide a target_user_id to view another user's orders."""
        db = SessionLocal()
        try:
            uid = target_user_id if (is_admin and target_user_id) else user_id
            orders = db.query(Order).filter(Order.user_id == uid).order_by(Order.id.desc()).limit(20).all()
            if not orders:
                return f"No orders found for user ID {uid}."
            
            result = []
            for o in orders:
                result.append(f"Order #{o.id} - Total: ${o.total_price:.2f} - Status: {o.status} - Address: {o.delivery_address}")
            return "\n".join(result)
        finally:
            db.close()

    @tool
    def get_order_details(order_id: int):
        """Get the specific items and details of an order by its ID."""
        db = SessionLocal()
        try:
            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return f"Order #{order_id} not found."
            
            # Permission check
            if not is_admin and order.user_id != user_id:
                return "You do not have permission to view this order."
                
            result = [f"Order #{order.id} Details:", f"Status: {order.status}", f"Total: ${order.total_price:.2f}", "Items:"]
            for item in order.items:
                result.append(f"- {item.product.name} (x{item.quantity}) @ ${item.price_at_purchase:.2f} each")
            return "\n".join(result)
        finally:
            db.close()

    @tool
    def update_order_status(order_id: int, new_status: str):
        """Update the status of an order (Admin only). Statuses: Pending, Processing, Shipped, Delivered, Cancelled."""
        if not is_admin:
            return "Permission denied. Only admins can update order statuses."
            
        db = SessionLocal()
        try:
            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return f"Order #{order_id} not found."
                
            old_status = order.status
            order.status = new_status
            
            # Optional: handle stock restoration on cancellation
            if new_status == "Cancelled" and old_status != "Cancelled":
                for item in order.items:
                    item.product.stock += item.quantity
                    
            db.commit()
            return f"Order #{order.id} status updated to '{new_status}'."
        except Exception as e:
            db.rollback()
            return f"Failed to update status: {e}"
        finally:
            db.close()

    llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0, api_key=api_key)
    tools = [checkout_cart, get_order_history, get_order_details, update_order_status]
    llm_with_tools = llm.bind_tools(tools)
    
    role_info = "You have ADMIN privileges. You can view all orders, specify target_user_id in history, and update statuses." if is_admin else "You are a customer. You can only view and checkout your own orders."
    messages = [
        SystemMessage(content=f"You are a helpful Order Management Agent. {role_info} Use the provided tools to manage orders. Do not try to access other agent capabilities. If an action is denied, explain why politely."),
        HumanMessage(content=state.get("user_message", ""))
    ]
    
    try:
        for i in range(3):
            response = llm_with_tools.invoke(messages)
            messages.append(response)
            
            if not response.tool_calls:
                logger.info(f"[{request_id}] [OrderAgent] Finished in {time.time()-start_time:.3f}s (Retries: {i})")
                return {"final_response": response.content}
                
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                
                start_tool = time.time()
                tool_result = "Tool not found"
                if tool_name == "checkout_cart":
                    tool_result = checkout_cart.invoke(tool_args)
                elif tool_name == "get_order_history":
                    tool_result = get_order_history.invoke(tool_args)
                elif tool_name == "get_order_details":
                    tool_result = get_order_details.invoke(tool_args)
                elif tool_name == "update_order_status":
                    tool_result = update_order_status.invoke(tool_args)
                    
                tool_time = time.time() - start_tool
                logger.info(f"[{request_id}] [Database] [OrderAgent] Tool '{tool_name}' executed in {tool_time:.3f}s")
                messages.append(ToolMessage(tool_call_id=tool_call["id"], name=tool_name, content=str(tool_result)))
                
        logger.warning(f"[{request_id}] [OrderAgent] Timeout after {time.time()-start_time:.3f}s")
        return {"error": "timeout"}
    except Exception as e:
        logger.error(f"[{request_id}] [OrderAgent] Failed: {type(e).__name__}")
        return {"error": "specialist_failed"}

def route_request(state: AgentState):
    if state.get("error") or state.get("final_response"):
        return END
    
    intent = state.get("intent")
    if intent == "unsafe" or intent == "clarify":
        return END
    if intent == "product_search":
        return "product_search_node"
    if intent == "cart":
        return "cart_node"
    if intent == "order":
        return "order_node"
    return END

# Build the Graph
graph_builder = StateGraph(AgentState)
graph_builder.add_node("orchestrator", orchestrator_node)
graph_builder.add_node("product_search_node", product_search_node)
graph_builder.add_node("cart_node", cart_node)
graph_builder.add_node("order_node", order_node)

graph_builder.add_edge(START, "orchestrator")
graph_builder.add_conditional_edges("orchestrator", route_request)
graph_builder.add_edge("product_search_node", "orchestrator")
graph_builder.add_edge("cart_node", "orchestrator")
graph_builder.add_edge("order_node", "orchestrator")

app_graph = graph_builder.compile()
