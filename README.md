
---

### 🟧 `zora-be` (Backend)

```markdown
# 🛠️ Zora Backend — NFT-based Event Ticketing API

This is the backend service for **Zora**, a blockchain-inspired ticketing app. It handles event creation, ticket tracking, and verification using Node.js and Supabase.

---

## 🧰 Tech Stack

- **Node.js** + **Express**
- **Supabase** (PostgreSQL + Auth)
- **Dotenv** for environment config
- **CORS** & JSON middleware

---

## 🔌 API Endpoints

> Base URL: `http://localhost:5000` (or your deployed backend URL)

### ✅ `POST /tickets/verify`
Verify a ticket based on:
- `ticketId`
- `eventId`
- (Optional) `buyerAddress`

Returns:
- Ticket status (`valid` or `invalid`)
- Ticket data (if valid)

---

### 🆕 `POST /events`
Create a new event:
- `name`
- `price`
- `quantity`

### 📄 `GET /events`
Returns all events in the system.

---

## ⚙️ Getting Started

```bash
git clone https://github.com/DevYoma/zora-be.git
cd zora-be
npm install
