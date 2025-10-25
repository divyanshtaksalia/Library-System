# 📚 Library Management System

This is a Full-Stack web application designed to digitize the process of issuing and returning books in the library for both students and administrators.

## ✨ Key Features

### Student
* **User Registration/Login:** Secure email/password-based authentication.
* **Browse Books:** View all available books.
* **Issue Books:** Issue available books directly from the dashboard.
* **View Orders:** Track currently issued books and their status.
* **Return Request:** Send requests to admin for returning books.

### Admin
* **Book Management:** Add new books to the library and remove old ones.
* **User Management:** View list of all registered students and block/unblock their accounts.
* **Return Handling:** Accept or reject pending return requests sent by students.

## ⚙️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla JS) |
| **Backend** | Node.js (Express.js) |
| **Database** | PostgreSQL (Hosted on Render) |
| **Deployment** | Render |

## 🚀 Project Deployment Status

This project is currently deployed on Render.

* **Live API Base URL:** `https://library-system-ovrx.onrender.com`

## 🛠️ Setup and Installation

### 1. Local Setup

1.  **Clone Repository:**
    ```bash
    git clone [https://github.com/divyanshtaksalia/Library-System.git](https://github.com/divyanshtaksalia/Library-System.git)
    cd Library-System
    ```
2.  **Install Packages:**
    ```bash
    npm install
    ```
3.  **Run Frontend:**
    * Open the `login.html` file directly in your browser (use file path, not `http://localhost`).
    * **Note:** Frontend files are already connected to the live Render API.

### 2. Backend (Server) Setup

This setup is only necessary when you want to run the code on localhost or configure deployment on Render.

1.  **Environment Variables:** Create a `.env` file in project root and add your PostgreSQL database credentials:
    ```env
    PORT=3000
    DB_HOST=your_render_db_host
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    ```
2.  **Run Server:**
    ```bash
    node server.js
    ```

## 🔑 Default Credentials

**Admin Login (Created in Render DB):**

| Details | Value |
| :--- | :--- |
| **Email** | `new.admin@mylibrary.com` |
| **Password** | `AdminPass2025` |

**Student Login:**
* You can create a new student account using the **Register** link on the frontend.

## 🤝 Contributing

If you want to contribute to improving this project, please submit a Pull Request.

## 📄 License

This project is released under the [ISC] license.

---