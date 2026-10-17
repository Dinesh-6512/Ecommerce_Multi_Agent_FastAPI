# Testing Checklist: E-Commerce Multi-Agent Feature

This document tracks the end-to-end testing of the AI Shop Assistant multi-agent workflow.

## 1. Product Search Agent
- [x] **PASS**: General product search (e.g., "Find me some shoes"). Returns accurate matches up to limit.
- [x] **PASS**: No-data cases (e.g., "Find me a spaceship"). Gracefully replies that no products match.
- [x] **PASS**: Category filters & Sorting (e.g., "Show me the cheapest electronics").
- [x] **PASS**: Stock checks (e.g., "How many of product ID 2 are left?").

## 2. Cart Agent
- [x] **PASS**: View cart for current user (displays items, quantities, subtotal, and total).
- [x] **PASS**: Add item to cart (checks stock limit, increments quantity safely).
- [x] **PASS**: Change quantity (updates quantity properly, rejects if over stock limits).
- [x] **PASS**: Remove item (setting quantity to 0 or explicitly removing deletes the DB record).
- [x] **PASS**: Duplicate action attempts (handled by atomic DB transactions and ReAct state limits).

## 3. Order Management Agent
- [x] **PASS**: Checkout cart (creates order, deducts stock, clears cart).
- [x] **PASS**: Duplicate checkout attempts (empty cart prevents double order creation).
- [x] **PASS**: View order history (customer sees only their own orders).
- [x] **PASS**: View order details (customer sees details only if `order.user_id == current_user.id`).
- [x] **PASS**: Admin status updates (admin can change status to 'Shipped', customer gets rejected).

## 4. Orchestrator & Flow
- [x] **PASS**: Correct Orchestrator routing (correctly parses intent to Product, Cart, or Order).
- [x] **PASS**: Unclear routing (returns 'clarify' safely instead of hallucinating).
- [x] **PASS**: Correct specialist result (Handoff loop correctly brings specialist answer back to Orchestrator and to the user).

## 5. Security & Isolation
- [x] **PASS**: User identity and role preservation (LLMs cannot modify `user_id` or `is_admin` states).
- [x] **PASS**: Unauthorized access attempts (Customers cannot view other users' orders or use admin endpoints).
- [x] **PASS**: Prompt-injection attempts (Inputs with "ignore instructions", "bypass", or length > 500 characters route immediately to 'unsafe' rejection).
- [x] **PASS**: Cross-agent misuse attempts (Cart Agent cannot invoke order tools, Product Agent cannot invoke cart tools. Tools are hard-bound to nodes).

## 6. Resilience & System Behavior
- [x] **PASS**: Timeout/failure handling (LLM crash or missing API key gracefully returns a generic technical error message to the Orchestrator without exposing stack traces).
- [x] **PASS**: API response behavior (FastAPI `/api/agent/ask` successfully wraps graph state and returns clean JSON).
- [ ] **PENDING**: ReactJS UI behavior when connected later (Requires frontend integration).
- [x] **PASS**: Existing e-commerce regression checks (Existing standard API routes for products/cart/orders remain completely untouched and functional).
