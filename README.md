# 35Lproject


To run this project, you need to have Node.js, npm, and python3 installed on your computer.
1. Install Node.js, npm, and python3
    ```bash
    sudo apt install nodejs npm python3
    ```
2. Clone this repository
    ```bash
    git clone https://github.com/tylerxiao/35Lproject.git
    ```
3. To run the backend, follow these steps:
    ```bash
    chmod +x backend
    export VITE_API_URL=http://localhost:8000
    export MONGODB_URL=[INSERT MONGODB URL]
    ./backend
    ```
And you should have a local version of the backend running!

4. To run the frontend, follow these steps:
    ```bash
    chmod +x frontend
    export VITE_FIREBASE_API_KEY=[INSERT FIREBASE API KEY]
    ./frontend
    ```
    The Firebase API key is necessary for the application to connect to Firebase services.

And you should have a local version of the frontend running!
