import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import Members from './pages/Members';
import YieldPool from './pages/YieldPool';
import MyAccount from './pages/MyAccount';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/members" element={<Members />} />
        <Route path="/yield" element={<YieldPool />} />
        <Route path="/account" element={<MyAccount />} />
      </Routes>
    </Layout>
  );
}

export default App;
