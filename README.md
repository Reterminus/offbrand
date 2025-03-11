# off-brand-print - A Shadowverse Custom Card Thing

A full-stack application for creating, managing and displaying Shadowverse cards with MongoDB, Express, React, and Node.js.

## Features

- Create custom Shadowverse cards with title, description, image, and other card attributes
- Organize cards into sets
- View cards in grid or list layout
- Hover over cards to see details
- Filter cards by class, rarity and other attributes 
- Search cards by name or description
- Add notes to cards within sets
- Admin authentication system for card management
- Responsive design for desktop and mobile viewing

## Project Structure

```
offbrand/
├── client/             # React frontend
│   ├── public/         # Static files
│   └── src/           
│       ├── components/ # Reusable components
│       ├── context/    # Context providers
│       ├── pages/      # Page components
│       ├── services/   # API services
│       ├── styles/     # CSS styles
│       └── utils/      # Utility functions
└── server/             # Express backend
    ├── config/         # Configuration files
    ├── controllers/    # Route controllers 
    ├── middleware/     # Custom middleware
    ├── models/         # MongoDB models
    ├── routes/         # API routes
    └── uploads/        # Card image uploads
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Setup and Installation

1. Clone the repository
2. Install server dependencies:
   ```
   cd server
   npm install
   ```
3. Install client dependencies:
   ```
   cd client
   npm install
   ```
4. Create a .env file in server directory with:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
5. Start the server:
   ```
   cd server
   npm start
   ```
6. Start the client:
   ```
   cd client
   npm start
   ```

## Usage

The application allows users to:
- Browse and view custom Shadowverse cards
- Search and filter cards by various attributes
- View cards organized in sets
- Toggle between grid and list views

Administrators can additionally:
- Create new cards and sets
- Edit existing cards and sets
- Organize cards into sets
- Add notes to cards within sets

## Technologies Used

- Frontend: React, React Router, Context API
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: JWT
- Image Storage: Local file system
- Styling: CSS Modules