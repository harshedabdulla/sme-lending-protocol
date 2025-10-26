import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import Members from './pages/Members';
import YieldPool from './pages/YieldPool';
import GasManager from './pages/GasManager';
import MyAccount from './pages/MyAccount';
import { NexusProvider } from './contexts/NexusContext';

function App() {
  return (
    <NexusProvider>
      <Routes>
        {/* Landing page without layout */}
        <Route path="/" element={<Landing />} />

        {/* App routes with layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/members" element={<Members />} />
          <Route path="/yield" element={<YieldPool />} />
          <Route path="/gas" element={<GasManager />} />
          <Route path="/account" element={<MyAccount />} />
        </Route>
      </Routes>
    </NexusProvider>
  );
}

export default App;
