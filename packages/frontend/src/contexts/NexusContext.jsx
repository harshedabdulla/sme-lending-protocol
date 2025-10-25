import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { initNexus, getNexus } from '../lib/nexus';

const NexusContext = createContext();

export function NexusProvider({ children }) {
    const { address, isConnected } = useAccount();
    const [nexus, setNexus] = useState(null);

    useEffect(() => {
        // Initialize Nexus with mock wallet provider for demo
        try {
            const mockWalletProvider = {
                getAddress: () => address || '0x0000000000000000000000000000000000000000',
                isConnected: isConnected || false,
            };

            const n = initNexus(mockWalletProvider);
            setNexus(n);
            console.log("Nexus initialized:", n);
        } catch (error) {
            console.error("Failed to initialize Nexus:", error);
        }
    }, [address, isConnected]);

    return (
        <NexusContext.Provider value={{ nexus, getNexus }}>
            {children}
        </NexusContext.Provider>
    );
}

export function useNexus() {
    const context = useContext(NexusContext);
    if (!context) {
        throw new Error('useNexus must be used within a NexusProvider');
    }
    return context;
}
