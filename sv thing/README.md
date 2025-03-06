# Digital Cards Application

A full-stack application for creating and displaying digital cards with MongoDB, Express, React, and Node.js.

## Features

- Create digital cards with title, description, and image
- View all cards in a grid layout
- Hover over cards to see details
- Edit existing cards
- Delete cards
- Responsive design

## Project Structure

```
digital-cards/
├── client/             # React frontend
│   ├── public/         # Static files
│   └── src/            # React source code
│       ├── components/ # Reusable components
│       ├── pages/      # Page components
│       └── services/   # API services
└── server/             # Express backend
    ├── models/         # MongoDB models
    ├── routes/         # API routes
    └── uploads/        # Uploaded images
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Setup and Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd digital-cards
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Create a `.env` file in the server directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/digital-cards
```

## Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. Start the client (in a new terminal):
```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

- **View Cards**: The home page displays all cards in a grid layout. Hover over a card to see its title and description in a detail window.
- **Create Card**: Click "Create Card" in the navigation bar to add a new card with a title, description, and image.
- **Edit Card**: Click the "Edit" button on a card to modify its details.
- **Delete Card**: Click the "Delete" button on a card to remove it from the collection.

## API Endpoints

- `GET /api/cards` - Get all cards
- `GET /api/cards/:id` - Get a specific card
- `POST /api/cards` - Create a new card
- `PATCH /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card

## Technologies Used

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express
- **Database**: MongoDB, Mongoose
- **File Upload**: Multer 