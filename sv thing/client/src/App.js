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
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/" element={<CardList />} />
            <Route path="/create" element={<CreateCard />} />
            <Route path="/edit/:id" element={<EditCard />} />
            <Route path="/sets" element={<SetList />} />
            <Route path="/sets/create" element={<CreateSet />} />
            <Route path="/sets/edit/:id" element={<EditSet />} />
            <Route path="/sets/:id" element={<SetDetail />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App; 