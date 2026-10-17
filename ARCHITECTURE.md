# Architecture Specifications: Multi-Agent AI Feature

## 1. End-to-End Flow

The multi-agent feature follows a strict execution path to ensure security, maintain context, and leverage existing business logic:

1. **ReactJS Shop Assistant** (User Interface)
2. -> **FastAPI `/api/agent/ask`** (API Endpoint)
3. -> **Orchestrator Agent** (LangGraph Router)
4. -> **Product Search Agent OR Cart Agent OR Order Management Agent** (LangChain Specialists)
5. -> **Existing application business/data layer** (FastAPI tool functions)
6. -> **Existing PostgreSQL/Neon database** when data is needed
7. -> **Specialist result** (Returned to LangGraph state)
8. -> **Orchestrator** (Formats final response)
9. -> **ReactJS UI** (Displays message)

## 2. Existing System vs. Multi-Agent Feature
- **What the existing application keeps doing:** The ReactJS frontend and FastAPI backend continue to handle all standard user registration, authentication (JWT), traditional UI navigation, and core database interactions using the existing SQLAlchemy models and business rules.
- **What the multi-agent feature adds:** A new `/api/agent/ask` endpoint and a LangGraph-based conversational workflow. This layer translates natural language into precise actions, passing them to the existing backend functions (via Tools), and formatting the returned data into human-readable text.

## 3. Authentication and Authorization
- **Where it is checked:** Authentication is checked immediately when the ReactJS app calls the FastAPI `/api/agent/ask` endpoint, leveraging the existing JWT token validation (`auth.get_current_user`). 
- **Authorization:** Before any tool executes an action (e.g., updating a cart or viewing an order), the FastAPI tool function itself enforces authorization by comparing the requested action against the authenticated user's ID and role (Customer/Admin).

## 4. Orchestration and Routing
- **How the Orchestrator routes:** The Orchestrator node uses an LLM to evaluate the user's intent based on the chat message. Using LangGraph's conditional edges, it routes the flow to the specific node (Product, Cart, or Order) best equipped to handle the task.

## 5. Specialist Access Boundaries
- **Product Search Agent:** Read-only access to product catalog and category tools. Cannot access user-specific data or modify the database.
- **Cart Agent:** Read/write access strictly limited to cart management tools tied to the authenticated user's ID.
- **Order Management Agent:** Read/write access limited to order tools. Customers can only view their own order history; Admins can view any order and update order statuses.

## 6. Context Propagation
- **Identity, Role, Permissions, and Request ID:** Upon a successful API request, FastAPI extracts the User ID and Role from the JWT, and generates a unique Request ID. These properties are injected into the initial **LangGraph State** (the shared memory/clipboard). As the flow moves from Orchestrator to Specialist and back, this state is passed along. This ensures that every agent operates under the correct, tamper-proof user identity.

## 7. Exceptions, Clarifications, and Unsafe Requests
- **Unsafe Requests:** If the Orchestrator detects malicious instructions, prompt injection, or out-of-scope requests (e.g., "Delete the database"), it bypasses specialist routing entirely and returns a safe refusal message.
- **Clarification:** If a request is highly ambiguous, the Orchestrator pauses the workflow and asks the user for clarification before selecting a specialist route.
- **Errors:** If a tool encounters an error (e.g., a database connection drop), the exception is caught within the tool or node. The state is updated with a safe error flag, prompting the Orchestrator to return a generic "Please try again later" message without exposing stack traces.
- **No-Data:** If a database query yields zero results (e.g., "Show me red shoes"), the tool returns an empty list to the agent, which then naturally informs the user that nothing was found.

## 8. Observability
- **Request Tracing:** The unique Request ID generated at the FastAPI entry point is logged alongside every major step (e.g., incoming request, Orchestrator routing decision, tool execution start/end, and final response). This allows developers to trace the entire lifespan of a request through the multi-agent system without logging sensitive personal data, secrets, or system prompts.
