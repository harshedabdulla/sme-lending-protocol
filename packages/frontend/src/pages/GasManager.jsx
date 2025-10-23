import GasManager from '../components/GasManager';

export default function GasManagerPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-gray-100">Gas Manager</h1>
                <p className="text-sm text-gray-500">
                    Manage cross-chain gas and optimize transaction costs
                </p>
            </div>

            <GasManager />
        </div>
    );
}
