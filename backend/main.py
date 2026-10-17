from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend import models, database, schemas, auth

# Create tables
try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception as e:
    print("Could not create tables:", e)

app = FastAPI(title="E-commerce API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to E-commerce API"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database connection failed")

# --- AUTHENTICATION ROUTES ---

@app.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Authenticate customer
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = auth.create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/admin/login", response_model=schemas.Token)
def admin_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Authenticate admin
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not an admin user")
    
    access_token = auth.create_access_token(data={"sub": str(user.id), "is_admin": True})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.post("/api/logout")
def logout():
    # Since we use JWT (stateless), logout happens by deleting the token on the frontend.
    return {"message": "Successfully logged out. Please remove the token on the client side."}

# --- CART HELPERS ---

def get_or_create_cart(db: Session, user_id: int) -> models.Cart:
    cart = db.query(models.Cart).filter(models.Cart.user_id == user_id).first()
    if not cart:
        cart = models.Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

def calculate_cart_total(cart: models.Cart) -> float:
    total = 0.0
    for item in cart.items:
        if item.product:
            total += item.product.price * item.quantity
    return total

# --- CUSTOMER ENDPOINTS ---

@app.get("/api/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(database.get_db)):
    return db.query(models.Category).all()

@app.get("/api/products", response_model=List[schemas.ProductResponse])
def get_products(search: Optional[str] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Product)
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%"))
    return query.all()

@app.get("/api/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(database.get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# --- ADMIN ENDPOINTS ---

def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@app.post("/api/admin/categories", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    new_category = models.Category(name=category.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@app.put("/api/admin/categories/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: int, category: schemas.CategoryCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_category.name = category.name
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/admin/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted"}

@app.post("/api/admin/products", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    new_product = models.Product(
        name=product.name,
        description=product.description,
        price=product.price,
        stock=product.stock,
        category_id=product.category_id
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@app.put("/api/admin/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.name = product.name
    db_product.description = product.description
    db_product.price = product.price
    db_product.stock = product.stock
    db_product.category_id = product.category_id
    
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted"}

# --- CART ENDPOINTS ---

@app.get("/api/cart", response_model=schemas.CartResponse)
def view_cart(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    total = calculate_cart_total(cart)
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": cart.items,
        "total": total
    }

@app.post("/api/cart/items", response_model=schemas.CartResponse)
def add_to_cart(item: schemas.CartItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    cart_item = db.query(models.CartItem).filter(models.CartItem.cart_id == cart.id, models.CartItem.product_id == item.product_id).first()
    
    new_quantity = item.quantity
    if cart_item:
        new_quantity += cart_item.quantity
        
    if new_quantity > product.stock:
        raise HTTPException(status_code=400, detail="Not enough stock available")
        
    if cart_item:
        cart_item.quantity = new_quantity
    else:
        cart_item = models.CartItem(cart_id=cart.id, product_id=item.product_id, quantity=item.quantity)
        db.add(cart_item)
        
    db.commit()
    db.refresh(cart)
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": cart.items,
        "total": calculate_cart_total(cart)
    }

@app.put("/api/cart/items/{item_id}", response_model=schemas.CartResponse)
def update_cart_item(item_id: int, quantity: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    cart_item = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.cart_id == cart.id).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
        
    if quantity <= 0:
        db.delete(cart_item)
    else:
        if quantity > cart_item.product.stock:
            raise HTTPException(status_code=400, detail="Not enough stock available")
        cart_item.quantity = quantity
        
    db.commit()
    db.refresh(cart)
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": cart.items,
        "total": calculate_cart_total(cart)
    }

@app.delete("/api/cart/items/{item_id}", response_model=schemas.CartResponse)
def remove_cart_item(item_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    cart_item = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.cart_id == cart.id).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
        
    db.delete(cart_item)
    db.commit()
    db.refresh(cart)
    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "items": cart.items,
        "total": calculate_cart_total(cart)
    }

# --- ORDER ENDPOINTS (CUSTOMER) ---

@app.post("/api/orders", response_model=schemas.OrderResponse)
def place_order(order_data: schemas.OrderCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    total_price = 0.0
    for item in cart.items:
        if item.quantity > item.product.stock:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {item.product.name}")
        total_price += item.product.price * item.quantity
        
    new_order = models.Order(
        user_id=current_user.id,
        total_price=total_price,
        delivery_address=order_data.delivery_address,
        status="Placed"
    )
    db.add(new_order)
    db.flush() # get new_order.id
    
    for item in cart.items:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_purchase=item.product.price
        )
        db.add(order_item)
        item.product.stock -= item.quantity # decrease stock
        db.delete(item) # clear cart item
        
    db.commit()
    db.refresh(new_order)
    return new_order

@app.get("/api/orders", response_model=List[schemas.OrderResponse])
def get_order_history(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).order_by(models.Order.id.desc()).all()
    return orders

@app.get("/api/orders/{order_id}", response_model=schemas.OrderResponse)
def get_order_details(order_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# --- ORDER ENDPOINTS (ADMIN) ---

@app.get("/api/admin/orders", response_model=List[schemas.OrderResponse])
def admin_get_all_orders(db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    return orders

@app.get("/api/admin/orders/{order_id}", response_model=schemas.OrderResponse)
def admin_get_order(order_id: int, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.put("/api/admin/orders/{order_id}/status", response_model=schemas.OrderResponse)
def admin_update_order_status(order_id: int, status_data: schemas.OrderStatusUpdate, db: Session = Depends(database.get_db), admin: models.User = Depends(check_admin)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status_data.status
    db.commit()
    db.refresh(order)
    return order

# --- AGENT ENDPOINT ---

import logging
import time
from pydantic import BaseModel
import uuid
from backend.agent import app_graph

logger = logging.getLogger("multi_agent")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

class AgentRequest(BaseModel):
    message: str

@app.post("/api/agent/ask")
def agent_ask(request: AgentRequest, current_user: models.User = Depends(auth.get_current_user)):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    logger.info(f"[{request_id}] [RequestStart] User={current_user.id}, Admin={current_user.is_admin}")
    
    initial_state = {
        "request_id": request_id,
        "user_id": current_user.id,
        "is_admin": current_user.is_admin,
        "user_message": request.message,
    }
    
    try:
        final_state = app_graph.invoke(initial_state)
        response_msg = final_state.get("final_response", "I could not generate a response.")
        status = "SUCCESS" if not final_state.get("error") else "PARTIAL_FAILURE"
    except Exception as e:
        logger.error(f"[{request_id}] [Agent Error] {type(e).__name__}")
        response_msg = "Sorry, I am unable to complete that request right now. Please try again later."
        status = "FAILURE"
        
    total_time = time.time() - start_time
    logger.info(f"[{request_id}] [RequestEnd] Status={status}, TotalTime={total_time:.3f}s")
    
    return {
        "request_id": request_id,
        "response": response_msg
    }
