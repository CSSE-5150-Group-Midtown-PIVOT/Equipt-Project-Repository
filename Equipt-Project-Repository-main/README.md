# Equipt Starter Web Application

This project is a simple starter web application for a software engineering class project. It uses plain HTML, CSS, and JavaScript with a simple MVC-style structure so beginners can understand how the pieces fit together.

## Project folder structure

```text
Equipt-Project-Repository-main/
├── index.html
├── assets/
├── controllers/
├── models/
├── services/
├── styles/
├── views/
└── README.md
```

## What each major folder is for

- assets/: Stores images, icons, and other static files.
- controllers/: Holds page and app logic that responds to user actions.
- models/: Defines the data structures used by the application.
- services/: Contains reusable logic for authentication, database access, and other backend-like tasks.
- styles/: Stores CSS files for the user interface.
- views/: Holds rendering helpers and view-related code.

## Running the project locally

1. Open the project folder in VS Code.
2. Start a simple local web server from the project root.
3. Open the project in a browser.

A simple option is to use a VS Code Live Server extension or run a basic server from the terminal.

## Where to place the main app pieces

- Models should be placed in the models folder.
- Views and rendering helpers should be placed in the views folder.
- Controller logic should be placed in the controllers folder.
- Reusable services should be placed in the services folder.
- Static assets should be placed in the assets folder.

## Firebase configuration

Firebase configuration belongs in the services/firebase-config.js file. This file currently contains a placeholder object where the real values should be added later.

## Authentication code location

Authentication-related code belongs in the services/authService.js file. This is where login, logout, and registration placeholder functions are defined.

## Database code location

Firestore database code belongs in the services/databaseService.js file. This is where create, read, update, and delete record placeholder functions are defined.

## What still needs to be configured before Firebase will work

Before Firebase Authentication and Firestore can work, you must:

- Create a Firebase project in the Firebase console.
- Enable Authentication and Firestore.
- Add your real Firebase configuration values to services/firebase-config.js.
- Install the Firebase SDK and import it into the app.
- Connect the placeholder service methods to the real Firebase API.

This starter project intentionally keeps the code simple and well commented so students can build on it step by step.
