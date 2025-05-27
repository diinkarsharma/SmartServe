#  SmartServe

**SmartServe** is an AI-enhanced web platform built during the Nagarro Hackathon 2025. It combines the power of **Next.js**, **React**, and **Genkit AI** to deliver intelligent, responsive, and user-friendly solutions.

---

##  Features

-  AI Integration using Genkit + GoogleAI
-  Context-aware interactions via `genkit` workflows
-  Dynamic charts with Recharts
-  Form validation powered by React Hook Form + Zod
-  Responsive UI using TailwindCSS + Radix UI
-  Real-time capabilities with Firebase

---

## Tech Stack

| Category       | Tools                                 |
|----------------|----------------------------------------|
| Frontend       | Next.js, React, TailwindCSS            |
| AI Integration | Genkit AI, GoogleAI                    |
| Backend/Auth   | Firebase                               |
| UI Components  | Radix UI, Lucide Icons                 |
| Dev Tools      | TypeScript, PostCSS, ESLint, Docker    |

---

##  Getting Started

###  Local Development

```bash
# Step 1: Navigate to project folder
cd smartserve-app

# Step 2: Install dependencies
npm install

# Step 3: Start development server
npm run dev
```

Visit the app at: [http://localhost:9002](http://localhost:9002)

---

##  Docker Instructions

###  Directory Structure

```
project-root/
├── Dockerfile
├── .dockerignore
└── smartserve-app/
    ├── package.json
    ├── pages/
    ├── public/
    └── ...
```

### Build and Run

```bash
# Build the image
docker build -t smartserve-app .

# Create an .env file with your API key
echo "GENKIT_API_KEY=your_api_key_here" > .env

# Run the container using the .env file
docker run -p 3000:3000 --env-file .env smartserve-app

```

# Replace `your_api_key_here` with your actual Genkit API key.

The app will be available at [http://localhost:3000](http://localhost:3000)

---
##  Development Credentials

>  **Note:** These credentials are for **demo/testing purposes only**. Please change them in production environments.

### Admin Login

- **Username:** `admin`  
- **Password:** `password`

### Kitchen Staff Login

- **Username:** `kitchen`  
- **Password:** `password`

---

##  Scripts

| Script             | Description                    |
|--------------------|--------------------------------|
| `npm run dev`      | Starts dev server on port 9002 |
| `npm run build`    | Builds production bundle       |
| `npm start`        | Starts the production server   |
| `npm run lint`     | Lint the codebase              |
| `npm run typecheck`| Run TypeScript checks          |

---

##  Team

- **Aryan Sapra , Dinkar Sharma** – Frontend, UI/UX
- **Divyam Chhabra** – Backend, AI Workflows
- **Dinkar Sharma** – Docker, Deployment
- **Dinkar Sharma , Aryan Sapra , Divyam Chhabra** - Ppt and Demo Video

---

##  Acknowledgements

Special thanks to **Nagarro** for organizing this hackathon and giving us the opportunity to innovate and showcase our skills.

