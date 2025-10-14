import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CardList from './pages/CardList';
import CreateCard from './pages/CreateCard';
import EditCard from './pages/EditCard';
import SetList from './pages/SetList';
import CreateSet from './pages/CreateSet';
import EditSet from './pages/EditSet';
import SetDetail from './pages/SetDetail';
import KeywordList from './pages/KeywordList';
import CreateKeyword from './pages/CreateKeyword';
import EditKeyword from './pages/EditKeyword';
import DeckBuilder from './pages/DeckBuilder';
import TakeTwo from './pages/TakeTwo';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<CardList />} />
              <Route path="/sets" element={<SetList />} />
              <Route path="/sets/:id" element={<SetDetail />} />
              <Route path="/keywords" element={<KeywordList />} />
              <Route path="/deck-builder" element={<DeckBuilder />} />
              <Route path="/take-two" element={<TakeTwo />} />
              <Route path="/login" element={<Login />} />
              
              {/* Admin-only routes */}
              <Route path="/create" element={
                <ProtectedRoute adminOnly={true}>
                  <CreateCard />
                </ProtectedRoute>
              } />
              <Route path="/edit/:id" element={
                <ProtectedRoute adminOnly={true}>
                  <EditCard />
                </ProtectedRoute>
              } />
              <Route path="/sets/create" element={
                <ProtectedRoute adminOnly={true}>
                  <CreateSet />
                </ProtectedRoute>
              } />
              <Route path="/sets/edit/:id" element={
                <ProtectedRoute adminOnly={true}>
                  <EditSet />
                </ProtectedRoute>
              } />
              <Route path="/keywords/create" element={
                <ProtectedRoute adminOnly={true}>
                  <CreateKeyword />
                </ProtectedRoute>
              } />
              <Route path="/keywords/edit/:id" element={
                <ProtectedRoute adminOnly={true}>
                  <EditKeyword />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 