# Coding Standards & Structure: Multi-Agent AI Feature

## 1. Directory Structure
The multi-agent feature lives directly inside the existing FastAPI backend to reuse existing database connections and business rules.

```text
backend/
├── main.py          <-- Exposes the /api/agent/ask endpoint
├── agent.py         <-- Contains the LangGraph workflow, State, and agent nodes
├── models.py        <-- Existing database models
├── schemas.py       <-- Existing Pydantic schemas
├── auth.py          <-- Existing authentication logic
├── database.py      <-- Existing database connection
└── requirements.txt <-- Updated to include langchain, langgraph, and pydantic
```

## 2. Multi-Agent Code Details

### `backend/agent.py`
- **AgentState:** A TypedDict defining the shared memory (`request_id`, `user_id`, `is_admin`, `user_message`, `intent`, `final_response`, `error`).
- **Orchestrator Node:** Acts as both a router and a final synthesizer. It reads the message, determines intent, and applies basic safety checks. When specialists finish processing, they hand control back to this node to format final answers or handle errors safely.
- **Specialist Nodes:** `product_search_node`, `cart_node`, and `order_node`. These nodes run autonomous LLM ReAct loops utilizing their scoped tools. They return a `final_response` or an `error` back to the Orchestrator.
- **Routing:** A conditional edge function (`route_request`) implements a Hub-and-Spoke model mapping the intent to the correct specialist node, and then ensuring specialists route back to the Orchestrator to terminate the flow safely.

### `backend/main.py`
- **`/api/agent/ask`:** A protected POST endpoint that relies on `auth.get_current_user`. It extracts the user's identity, initializes the graph state, runs `app_graph.invoke()`, and returns the natural language response. It uses a `try-except` block to mask any graph errors from the client.

## 3. Tool Boundaries
The LLMs are fully wired, and each specialist node creates its tools dynamically to lock them into the current user's execution context:
- **Product Agent:** `search_products`, `get_categories`, `get_product_details` (Read-only capabilities).
- **Cart Agent:** `view_cart`, `add_to_cart`, `update_cart_quantity`, `remove_from_cart` (Modifies only the active user's cart without touching orders).
- **Order Agent:** `get_order_history`, `get_order_details`, `checkout_cart`, `update_order_status` (Respects `is_admin` flag strictly).

## 4. Basic Safety & Fallbacks
- The Orchestrator node intercepts unsafe keywords (e.g., "drop", "delete", "ignore instructions") and halts execution before reaching any database tools.
- Unexpected errors within the LangGraph flow are caught at the endpoint level, returning a safe, generic error message.

## 5. Observability & Tracing
- **Implementation:** Built entirely using Python's standard `logging` and `time` modules inside the FastAPI application framework (logger `multi_agent`).
- **Trace ID:** Every incoming request to `/api/agent/ask` generates a UUID `request_id` which tags every related log line.
- **Metrics Collected:** Logs capture overall request time (in `main.py`), Orchestrator parsing time, Specialist Agent execution time including ReAct retry counts, and individual Tool/Database execution times.
- **Safe Logging:** Logs intentionally omit all PII, payloads, prompts, tokens, or database secrets. Only IDs, statuses, and performance timings are captured.
- **Where to check:** Since it uses `logging.StreamHandler`, you can check the standard stdout terminal where FastAPI/Uvicorn is running to see the live multi-agent traces.
