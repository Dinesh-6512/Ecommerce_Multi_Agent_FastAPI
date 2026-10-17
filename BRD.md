# Business Requirements Document (BRD)
## Multi-Agent AI E-Commerce Assistant

### 1. Business Problem
Customers often struggle to find specific products, manage their shopping carts, and check their order status through traditional UI navigation alone. This can lead to frustration, abandoned carts, and increased support requests. 

### 2. Goal of the Multi-Agent Feature
To integrate an intelligent, chat-based AI assistant into the existing e-commerce application. This multi-agent system will allow users to use natural language to search for products, manage their cart, and review or update their orders, providing a seamless and personalized shopping experience.
**Note:** This project will strictly reuse the existing ReactJS frontend, FastAPI backend, authentication, PostgreSQL/Neon database, and existing business rules. No new database or backend will be created.

### 3. Target Users
- **Customer:** Shoppers who want to easily find products, modify their carts, and track their orders using chat.
- **Admin:** Store managers who might need assistance looking up order statuses across the system.

### 4. The Four Agents and Their Responsibilities
1. **Orchestrator Agent:** The central router. Receives the user's chat request, determines the intent, routes it to the correct specialist agent, and returns the final response to the user. It does not access the database directly.
2. **Product Search Agent:** A read-only specialist for answering product queries. It handles searching products, browsing categories, checking stock, and retrieving product details.
3. **Cart Agent:** A specialist that manages the authenticated user's shopping cart. It can view the cart, add items, update quantities, and remove items based on user requests.
4. **Order Management Agent:** A specialist that handles queries related to orders. For customers, it retrieves their personal order history and details. For admins, it can retrieve any order and update order statuses.

### 5. Use Cases

#### Product/Search Use Cases
- User asks for products matching a search term (e.g., "Show me blue shoes").
- User asks for product details or price by name.
- User asks if a specific item is in stock.

#### Cart Use Cases
- User asks to see what is currently in their cart.
- User asks to add a specific quantity of a product to their cart.
- User asks to change the quantity of an item already in their cart.
- User asks to remove an item from their cart.

#### Order Management Use Cases
- User asks for the status of their recent orders.
- User asks to see the details of a specific past order.
- Admin asks to retrieve a specific customer's order.
- Admin asks to update the status of an order (e.g., to "Shipped").

### 6. Main User Flow
1. **Authentication:** The user logs in via the existing ReactJS frontend to establish identity and role (Customer/Admin).
2. **Request:** The user sends a natural language message via the chat interface.
3. **Orchestration:** The FastAPI backend receives the request and passes the message, user ID, and role to the **Orchestrator Agent**.
4. **Routing:** The Orchestrator determines the intent and hands off the state/context to the appropriate specialist agent (Product, Cart, or Order).
5. **Tool Execution:** The specialist agent uses specific tools (mapped to existing backend logic) to query or modify the database safely on behalf of the user.
6. **Response:** The specialist agent passes the result back to the Orchestrator, which formats a friendly final reply and sends it back to the ReactJS frontend.

### 7. In Scope
- Implementing the LangGraph-based multi-agent workflow within the existing FastAPI backend.
- Creating the four defined agents with strict boundaries.
- Integrating LangChain for model wrappers, prompts, and structured tool calling.
- Creating a chat interface in the ReactJS frontend to interact with the agents.
- Handling empty data, clarification requests, and agent handoffs gracefully.

### 8. Out of Scope
- Creating a new database, authentication system, or standalone backend service.
- Integrating real payment gateways (checkout remains simulated).
- Modifying the core data models or existing business rules.
- Allowing agents to perform actions outside the current application's capabilities (e.g., agents cannot create discount codes because the app doesn't support them).

### 9. Security Expectations
- **Prompt Injection:** The system must be resilient to prompt injection and malicious instructions (e.g., attempting to bypass system instructions).
- **Data Privacy:** The agents must never expose passwords, API keys, database credentials, system prompts, or unnecessary personal information in the chat.
- **Idempotency:** Prevent duplicate cart or order actions caused by retries or repeated user clicks.
- **Truthfulness:** Agents must not hallucinate or invent data; they must rely strictly on real application and database results.

### 10. User/Role Permission Expectations
- **Context Preservation:** The authenticated user's identity (user ID) and role (Admin/Customer) must be preserved during every handoff between agents.
- **Authorization:** Specialist agents must respect existing permissions. A regular customer must only be able to view and modify their own cart and view their own orders. Only admins can update order statuses or view all orders.
- **Read-Only Boundaries:** The Product Search Agent must strictly remain read-only.

### 11. Success Criteria
- The chat assistant accurately routes user intents to the correct specialist agent 95%+ of the time.
- The Cart Agent successfully adds/modifies items strictly for the logged-in user.
- The Order Agent only returns order details authorized for the requesting user's role.
- No secrets or system prompts are leaked during conversational interactions.
- The existing traditional UI flows continue to work flawlessly alongside the new AI features.
