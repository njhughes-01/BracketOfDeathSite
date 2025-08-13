"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const api_1 = __importDefault(require("../services/api"));
const Card_1 = __importDefault(require("../components/ui/Card"));
const LoadingSpinner_1 = __importDefault(require("../components/ui/LoadingSpinner"));
const admin_1 = require("../components/admin");
const TournamentSetup = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [currentStep, setCurrentStep] = (0, react_1.useState)(0);
    const [nextBodNumber, setNextBodNumber] = (0, react_1.useState)(null);
    const [availablePlayers, setAvailablePlayers] = (0, react_1.useState)([]);
    const [selectedPlayers, setSelectedPlayers] = (0, react_1.useState)([]);
    const [generatedSeeds, setGeneratedSeeds] = (0, react_1.useState)([]);
    const [generatedTeams, setGeneratedTeams] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [setupData, setSetupData] = (0, react_1.useState)({
        basicInfo: {
            date: '',
            bodNumber: 0,
            format: 'Mixed',
            location: '',
            advancementCriteria: 'Top teams advance based on round-robin performance',
            notes: '',
            photoAlbums: '',
            status: 'scheduled',
            maxPlayers: 16
        },
        seedingConfig: {
            method: 'historical',
            parameters: {
                championshipWeight: 0.3,
                winPercentageWeight: 0.4,
                avgFinishWeight: 0.3,
                recentTournamentCount: 5
            }
        },
        teamFormationConfig: {
            method: 'manual',
            parameters: {
                skillBalancing: true,
                avoidRecentPartners: false,
                maxTimesPartnered: 3
            }
        },
        bracketType: 'round_robin_playoff',
        maxPlayers: 16
    });
    const formatOptions = [
        { value: 'M', label: "Men's" },
        { value: 'W', label: "Women's" },
        { value: 'Mixed', label: "Mixed" },
        { value: "Men's Singles", label: "Men's Singles" },
        { value: "Men's Doubles", label: "Men's Doubles" },
        { value: "Women's Doubles", label: "Women's Doubles" },
        { value: "Mixed Doubles", label: "Mixed Doubles" }
    ];
    const steps = [
        { id: 'basic', title: 'Basic Information', completed: false },
        { id: 'players', title: 'Player Selection', completed: false },
        { id: 'seeding', title: 'Seeding & Teams', completed: false },
        { id: 'settings', title: 'Tournament Settings', completed: false },
        { id: 'review', title: 'Review & Create', completed: false }
    ];
    (0, react_1.useEffect)(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const bodResponse = await api_1.default.getNextBodNumber();
                if (bodResponse.success && bodResponse.data) {
                    const nextNumber = bodResponse.data.nextBodNumber;
                    setNextBodNumber(nextNumber);
                    setSetupData(prev => ({
                        ...prev,
                        basicInfo: { ...prev.basicInfo, bodNumber: nextNumber }
                    }));
                }
                const playersResponse = await api_1.default.getPlayers({ limit: 1000 });
                if (playersResponse.data) {
                    setAvailablePlayers(playersResponse.data);
                }
            }
            catch (err) {
                setError('Failed to load initial data');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);
    const updateBasicInfo = (field, value) => {
        setSetupData(prev => ({
            ...prev,
            basicInfo: { ...prev.basicInfo, [field]: value }
        }));
    };
    const generateSeeds = async () => {
        if (selectedPlayers.length === 0) {
            setError('Please select players first');
            return;
        }
        try {
            setLoading(true);
            const response = await api_1.default.generatePlayerSeeds(setupData.seedingConfig);
            if (response.success && response.data) {
                const filteredSeeds = response.data.filter(seed => selectedPlayers.includes(seed.playerId));
                setGeneratedSeeds(filteredSeeds);
            }
        }
        catch (err) {
            setError('Failed to generate player seeds');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const generateTeams = async () => {
        if (selectedPlayers.length === 0) {
            setError('Please select players first');
            return;
        }
        try {
            setLoading(true);
            const response = await api_1.default.generateTeams(selectedPlayers, setupData.teamFormationConfig);
            if (response.success && response.data) {
                setGeneratedTeams(response.data);
            }
        }
        catch (err) {
            setError('Failed to generate teams');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePlayerSelection = (0, react_1.useCallback)((playerId, selected) => {
        setError(null);
        setSelectedPlayers(prev => {
            if (selected) {
                if (prev.includes(playerId)) {
                    return prev;
                }
                if (prev.length >= setupData.maxPlayers) {
                    setError(`Cannot select more than ${setupData.maxPlayers} players`);
                    return prev;
                }
                return [...prev, playerId];
            }
            else {
                return prev.filter(id => id !== playerId);
            }
        });
    }, [setupData.maxPlayers]);
    const createTournament = async () => {
        try {
            setLoading(true);
            const cleanBasicInfo = { ...setupData.basicInfo };
            if (!cleanBasicInfo.notes || cleanBasicInfo.notes.trim() === '') {
                delete cleanBasicInfo.notes;
            }
            if (!cleanBasicInfo.photoAlbums || cleanBasicInfo.photoAlbums.trim() === '') {
                delete cleanBasicInfo.photoAlbums;
            }
            const cleanSetupData = {
                ...setupData,
                basicInfo: cleanBasicInfo,
                selectedPlayers,
                generatedSeeds,
                generatedTeams
            };
            console.log('Creating tournament with setup data:', cleanSetupData);
            const response = await api_1.default.setupTournament(cleanSetupData);
            if (response.success && response.data) {
                navigate(`/tournaments/${response.data._id || response.data.id}`);
            }
        }
        catch (err) {
            console.error('Tournament creation error:', err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create tournament';
            setError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (<admin_1.EditableCard title="Tournament Details">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input type="date" value={setupData.basicInfo.date} onChange={(e) => updateBasicInfo('date', e.target.value)} className="input" required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BOD Number</label>
                  <input type="number" value={setupData.basicInfo.bodNumber} onChange={(e) => updateBasicInfo('bodNumber', parseInt(e.target.value))} className="input bg-gray-50" disabled title="Auto-generated as next sequential number"/>
                  <p className="text-xs text-gray-500 mt-1">Auto-generated as #{nextBodNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format *</label>
                  <select value={setupData.basicInfo.format} onChange={(e) => updateBasicInfo('format', e.target.value)} className="select" required>
                    {formatOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Players</label>
                  <select value={setupData.maxPlayers} onChange={(e) => {
                        const maxPlayers = parseInt(e.target.value);
                        setSetupData(prev => ({ ...prev, maxPlayers }));
                        updateBasicInfo('maxPlayers', maxPlayers);
                    }} className="select">
                    <option value={8}>8 Players (4 Teams)</option>
                    <option value={16}>16 Players (8 Teams)</option>
                    <option value={32}>32 Players (16 Teams)</option>
                    <option value={64}>64 Players (32 Teams)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                <input type="text" value={setupData.basicInfo.location} onChange={(e) => updateBasicInfo('location', e.target.value)} className="input" placeholder="Tournament location" required/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Advancement Criteria</label>
                <textarea value={setupData.basicInfo.advancementCriteria} onChange={(e) => updateBasicInfo('advancementCriteria', e.target.value)} className="input" rows={3} placeholder="How players advance through the tournament"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea value={setupData.basicInfo.notes || ''} onChange={(e) => updateBasicInfo('notes', e.target.value)} className="input" rows={2} placeholder="Additional tournament notes"/>
              </div>
            </div>
          </admin_1.EditableCard>);
            case 1:
                return (<admin_1.EditableCard title="Select Tournament Players">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Select {setupData.maxPlayers} players for this tournament
                  </p>
                  <p className="text-xs text-gray-500">
                    Selected: {selectedPlayers.length} / {setupData.maxPlayers}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => {
                        setError(null);
                        const sortedPlayers = [...availablePlayers].sort((a, b) => {
                            const aScore = (a.winningPercentage * 100) + (a.totalChampionships * 10);
                            const bScore = (b.winningPercentage * 100) + (b.totalChampionships * 10);
                            return bScore - aScore;
                        });
                        const topPlayers = sortedPlayers.slice(0, setupData.maxPlayers);
                        setSelectedPlayers(topPlayers.map(p => p.id));
                    }} className="btn btn-outline btn-sm" type="button">
                    Select Top {setupData.maxPlayers}
                  </button>
                  <button onClick={() => {
                        setError(null);
                        setSelectedPlayers([]);
                    }} className="btn btn-outline btn-sm" type="button">
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {availablePlayers.map(player => {
                        const isSelected = selectedPlayers.includes(player.id);
                        return (<div key={`player-${player.id}`} className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'}`} onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const checkbox = e.currentTarget.querySelector('input[type="checkbox"]');
                                if (checkbox) {
                                    const newChecked = !checkbox.checked;
                                    handlePlayerSelection(player.id, newChecked);
                                }
                            }}>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                                e.stopPropagation();
                                handlePlayerSelection(player.id, e.target.checked);
                            }} className="rounded"/>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{player.name}</p>
                          <div className="text-xs text-gray-500">
                            <span>BODs: {player.bodsPlayed}</span>
                            <span className="mx-2">•</span>
                            <span>Win%: {(player.winningPercentage * 100).toFixed(1)}%</span>
                            <span className="mx-2">•</span>
                            <span>Champ: {player.totalChampionships}</span>
                          </div>
                        </div>
                      </div>
                    </div>);
                    })}
              </div>
            </div>
          </admin_1.EditableCard>);
            case 2:
                return (<div className="space-y-6">
            <admin_1.EditableCard title="Seeding Configuration">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seeding Method</label>
                  <select value={setupData.seedingConfig.method} onChange={(e) => setSetupData(prev => ({
                        ...prev,
                        seedingConfig: { ...prev.seedingConfig, method: e.target.value }
                    }))} className="select">
                    <option value="historical">Historical Performance</option>
                    <option value="recent_form">Recent Form (Last 5 tournaments)</option>
                    <option value="elo">ELO Rating System</option>
                    <option value="manual">Manual Seeding</option>
                  </select>
                </div>

                {setupData.seedingConfig.method === 'historical' && (<div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Championship Weight</label>
                      <input type="range" min="0" max="1" step="0.1" value={setupData.seedingConfig.parameters?.championshipWeight || 0.3} onChange={(e) => setSetupData(prev => ({
                            ...prev,
                            seedingConfig: {
                                ...prev.seedingConfig,
                                parameters: {
                                    ...prev.seedingConfig.parameters,
                                    championshipWeight: parseFloat(e.target.value)
                                }
                            }
                        }))} className="w-full"/>
                      <span className="text-xs text-gray-500">{((setupData.seedingConfig.parameters?.championshipWeight || 0.3) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Win Percentage Weight</label>
                      <input type="range" min="0" max="1" step="0.1" value={setupData.seedingConfig.parameters?.winPercentageWeight || 0.4} onChange={(e) => setSetupData(prev => ({
                            ...prev,
                            seedingConfig: {
                                ...prev.seedingConfig,
                                parameters: {
                                    ...prev.seedingConfig.parameters,
                                    winPercentageWeight: parseFloat(e.target.value)
                                }
                            }
                        }))} className="w-full"/>
                      <span className="text-xs text-gray-500">{((setupData.seedingConfig.parameters?.winPercentageWeight || 0.4) * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Avg Finish Weight</label>
                      <input type="range" min="0" max="1" step="0.1" value={setupData.seedingConfig.parameters?.avgFinishWeight || 0.3} onChange={(e) => setSetupData(prev => ({
                            ...prev,
                            seedingConfig: {
                                ...prev.seedingConfig,
                                parameters: {
                                    ...prev.seedingConfig.parameters,
                                    avgFinishWeight: parseFloat(e.target.value)
                                }
                            }
                        }))} className="w-full"/>
                      <span className="text-xs text-gray-500">{((setupData.seedingConfig.parameters?.avgFinishWeight || 0.3) * 100).toFixed(0)}%</span>
                    </div>
                  </div>)}

                <button onClick={generateSeeds} disabled={loading || selectedPlayers.length === 0} className="btn btn-primary">
                  {loading ? 'Generating...' : 'Generate Player Seeds'}
                </button>

                {generatedSeeds.length > 0 && (<div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Generated Seeds</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {generatedSeeds.map(seed => (<div key={`seed-${seed.playerId}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">#{seed.seed} {seed.playerName}</span>
                          <span className="text-xs text-gray-500">
                            {(seed.statistics.winningPercentage * 100).toFixed(1)}% / {seed.statistics.totalChampionships} champ
                          </span>
                        </div>))}
                    </div>
                  </div>)}
              </div>
            </admin_1.EditableCard>

            <admin_1.EditableCard title="Team Formation">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Team Formation Method</label>
                  <select value={setupData.teamFormationConfig.method} onChange={(e) => setSetupData(prev => ({
                        ...prev,
                        teamFormationConfig: { ...prev.teamFormationConfig, method: e.target.value }
                    }))} className="select">
                    <option value="preformed">Pre-formed Teams</option>
                    <option value="draft">Draft Style (Snake Draft)</option>
                    <option value="statistical_pairing">Statistical Pairing</option>
                    <option value="random">Random Pairing</option>
                    <option value="manual">Manual Assignment</option>
                  </select>
                </div>

                {setupData.teamFormationConfig.method === 'statistical_pairing' && (<div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={setupData.teamFormationConfig.parameters?.skillBalancing || false} onChange={(e) => setSetupData(prev => ({
                            ...prev,
                            teamFormationConfig: {
                                ...prev.teamFormationConfig,
                                parameters: {
                                    ...prev.teamFormationConfig.parameters,
                                    skillBalancing: e.target.checked
                                }
                            }
                        }))} className="rounded"/>
                      <span className="text-sm">Balance team skill levels</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={setupData.teamFormationConfig.parameters?.avoidRecentPartners || false} onChange={(e) => setSetupData(prev => ({
                            ...prev,
                            teamFormationConfig: {
                                ...prev.teamFormationConfig,
                                parameters: {
                                    ...prev.teamFormationConfig.parameters,
                                    avoidRecentPartners: e.target.checked
                                }
                            }
                        }))} className="rounded"/>
                      <span className="text-sm">Avoid recent tournament partners</span>
                    </label>
                  </div>)}

                <button onClick={generateTeams} disabled={loading || selectedPlayers.length === 0} className="btn btn-primary">
                  {loading ? 'Generating...' : 'Generate Teams'}
                </button>

                {generatedTeams.length > 0 && (<div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Generated Teams</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {generatedTeams.map(team => (<div key={`team-${team.teamId}`} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">#{team.combinedSeed} {team.teamName}</span>
                            <span className="text-xs text-gray-500">{team.combinedStatistics.combinedWinPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {team.players.map(p => p.playerName).join(' & ')}
                          </div>
                        </div>))}
                    </div>
                  </div>)}
              </div>
            </admin_1.EditableCard>
          </div>);
            case 3:
                return (<admin_1.EditableCard title="Tournament Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bracket Type</label>
                <select value={setupData.bracketType} onChange={(e) => setSetupData(prev => ({ ...prev, bracketType: e.target.value }))} className="select">
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin_playoff">Round Robin + Playoffs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Deadline</label>
                <input type="datetime-local" value={setupData.registrationDeadline || ''} onChange={(e) => setSetupData(prev => ({ ...prev, registrationDeadline: e.target.value }))} className="input"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tournament Status</label>
                <select value={setupData.basicInfo.status} onChange={(e) => updateBasicInfo('status', e.target.value)} className="select">
                  <option value="scheduled">Scheduled</option>
                  <option value="open">Open for Registration</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
          </admin_1.EditableCard>);
            case 4:
                return (<div className="space-y-6">
            <admin_1.EditableCard title="Tournament Summary">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Basic Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Date: {new Date(setupData.basicInfo.date).toLocaleDateString()}</p>
                      <p>BOD Number: #{setupData.basicInfo.bodNumber}</p>
                      <p>Format: {setupData.basicInfo.format}</p>
                      <p>Location: {setupData.basicInfo.location}</p>
                      <p>Max Players: {setupData.maxPlayers}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Configuration</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Seeding: {setupData.seedingConfig.method.replace('_', ' ')}</p>
                      <p>Teams: {setupData.teamFormationConfig.method.replace('_', ' ')}</p>
                      <p>Bracket: {setupData.bracketType.replace('_', ' ')}</p>
                      <p>Players Selected: {selectedPlayers.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </admin_1.EditableCard>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 text-lg">⚠️</span>
                <div>
                  <h4 className="font-medium text-yellow-800">Ready to Create Tournament</h4>
                  <p className="text-sm text-yellow-700">
                    Once created, the tournament will be {setupData.basicInfo.status} and 
                    {setupData.basicInfo.status === 'open' ? ' players can register' : ' ready for management'}.
                  </p>
                </div>
              </div>
            </div>
          </div>);
            default:
                return null;
        }
    };
    if (loading && currentStep === 0) {
        return (<div className="flex items-center justify-center min-h-96">
        <LoadingSpinner_1.default size="lg"/>
        <span className="ml-3 text-gray-500">Loading tournament setup...</span>
      </div>);
    }
    return (<div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournament Setup Wizard</h1>
          <p className="text-gray-600">Create and configure a new tournament</p>
        </div>
        <button onClick={() => navigate('/tournaments')} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      
      <Card_1.default>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (<div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${index === currentStep
                ? 'bg-blue-600 text-white'
                : index < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'}`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (<div className={`flex-1 h-0.5 mx-4 ${index < currentStep ? 'bg-green-600' : 'bg-gray-200'}`}/>)}
            </div>))}
        </div>
      </Card_1.default>

      
      {error && (<div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        </div>)}

      
      {renderStepContent()}

      
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="btn btn-secondary disabled:opacity-50">
          Previous
        </button>

        <div className="flex space-x-2">
          {currentStep < steps.length - 1 ? (<button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} className="btn btn-primary" disabled={(currentStep === 0 && (!setupData.basicInfo.date || !setupData.basicInfo.location)) ||
                (currentStep === 1 && selectedPlayers.length === 0)}>
              Next
            </button>) : (<button onClick={createTournament} disabled={loading || selectedPlayers.length === 0} className="btn btn-primary disabled:opacity-50">
              {loading ? (<>
                  <LoadingSpinner_1.default size="sm"/>
                  <span className="ml-2">Creating Tournament...</span>
                </>) : ('Create Tournament')}
            </button>)}
        </div>
      </div>
    </div>);
};
exports.default = TournamentSetup;
//# sourceMappingURL=TournamentSetup.js.map