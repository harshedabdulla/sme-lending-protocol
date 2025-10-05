import { useState } from 'react';

function App() {
  const [account, setAccount] = useState(null);

  return (
    <div>
      <h1>SME Lending Protocol</h1>
      <p>Connected Account: {account || 'Not connected'}</p>
    </div>
  );
}

export default App;
