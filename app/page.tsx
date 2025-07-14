'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Activity, 
  Target, 
  BarChart3, 
  Wifi, 
  WifiOff, 
  Upload, 
  Download, 
  RefreshCw,
  Zap,
  CloudOff
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';

// Importar as funções do Google Sheets
import { 
  useGoogleSheetsRoutes,
  RouteData,
  RouteUtils,
  STATUS_LABELS,
  STATUS_COLORS,
  SEQUENCE_COLORS
} from '../utils/googleSheetsRoutes';

// Tipos para os gráficos
interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface SequenceData {
  name: string;
  total: number;
  completed: number;
}

interface PerformanceData {
  time: string;
  completed: number;
  delayed: number;
  active: number;
}

interface StatCard {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Componente do Modal
interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRoute: RouteData | null;
  onSubmit: (route: Omit<RouteData, 'id'> | RouteData) => void;
}

const AddRouteModal: React.FC<AddRouteModalProps> = ({ 
  isOpen, 
  onClose, 
  editingRoute, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState({
    sequencia: '',
    rota: '',
    hrFinalizar: '',
    hrConferencia: '',
    status: 'scheduled' as RouteData['status']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRoute) {
      setFormData({
        sequencia: editingRoute.sequencia,
        rota: editingRoute.rota.toString(),
        hrFinalizar: editingRoute.hrFinalizar,
        hrConferencia: editingRoute.hrConferencia,
        status: editingRoute.status
      });
    } else {
      setFormData({
        sequencia: '',
        rota: '',
        hrFinalizar: '',
        hrConferencia: '',
        status: 'scheduled'
      });
    }
  }, [editingRoute]);

  const handleSubmit = useCallback(async () => {
    if (!formData.sequencia || !formData.rota || !formData.hrFinalizar || !formData.hrConferencia) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      const routeData = {
        sequencia: formData.sequencia,
        rota: parseInt(formData.rota, 10),
        hrFinalizar: formData.hrFinalizar,
        hrConferencia: formData.hrConferencia,
        status: formData.status
      };

      if (editingRoute) {
        onSubmit({ ...routeData, id: editingRoute.id });
      } else {
        onSubmit(routeData);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      alert('Erro ao salvar rota. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingRoute, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {editingRoute ? 'Editar Rota' : 'Nova Rota'}
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Sequência *
            </label>
            <select
              value={formData.sequencia}
              onChange={(e) => setFormData(prev => ({ ...prev, sequencia: e.target.value }))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
              disabled={isSubmitting}
            >
              <option value="">Selecione...</option>
              <option value="1ª ROTA">1ª ROTA</option>
              <option value="2ª ROTA">2ª ROTA</option>
              <option value="3ª ROTA">3ª ROTA</option>
              <option value="4ª ROTA">4ª ROTA</option>
              <option value="5ª ROTA">5ª ROTA</option>
              <option value="6ª ROTA">6ª ROTA</option>
              <option value="7ª ROTA">7ª ROTA</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Número da Rota *
            </label>
            <input
              type="number"
              value={formData.rota}
              onChange={(e) => setFormData(prev => ({ ...prev, rota: e.target.value }))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Ex: 665"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Hora Finalizar *
            </label>
            <input
              type="time"
              value={formData.hrFinalizar}
              onChange={(e) => setFormData(prev => ({ ...prev, hrFinalizar: e.target.value }))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Hora Conferência *
            </label>
            <input
              type="time"
              value={formData.hrConferencia}
              onChange={(e) => setFormData(prev => ({ ...prev, hrConferencia: e.target.value }))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                status: e.target.value as RouteData['status'] 
              }))}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              disabled={isSubmitting}
            >
              <option value="scheduled">Agendada</option>
              <option value="active">Em Andamento</option>
              <option value="pending">Pendente</option>
              <option value="delayed">Atrasada</option>
              <option value="completed">Concluída</option>
            </select>
          </div>
          
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </div>
              ) : (
                editingRoute ? 'Atualizar' : 'Adicionar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const RouteManagementSystem: React.FC = () => {
  // Hook do Google Sheets
  const {
    routes,
    error,
    lastUpdate,
    isOnline,
    isClient,
    loading,
    pendingChanges,
    hasPendingChanges,
    apiStatus,
    connectionStatus,
    addRoute,
    updateRoute,
    deleteRoute,
    syncWithSheet,
    reloadFromSheet,
    getStatistics,
    clearError,
    testConnection
  } = useGoogleSheetsRoutes();
  
  // Estados da interface
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [appCurrentTime, setAppCurrentTime] = useState<Date>(new Date());
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Atualiza o relógio a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setAppCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Funções utilitárias
  const getStatusColor = useCallback((status: RouteData['status']): string => {
    const statusColors = {
      completed: 'bg-gradient-to-r from-green-400 to-green-600 text-white',
      active: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
      delayed: 'bg-gradient-to-r from-red-400 to-red-600 text-white',
      pending: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      scheduled: 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
    };
    return statusColors[status] || 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
  }, []);

  const getStatusIcon = useCallback((status: RouteData['status']) => {
    const statusIcons = {
      completed: <CheckCircle className="w-4 h-4" />,
      delayed: <AlertCircle className="w-4 h-4" />,
      active: <Activity className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      scheduled: <Calendar className="w-4 h-4" />
    };
    return statusIcons[status] || <Clock className="w-4 h-4" />;
  }, []);

  const getStatusText = useCallback((status: RouteData['status']): string => {
    return STATUS_LABELS[status] || 'Desconhecido';
  }, []);

  const getSequenceColor = useCallback((sequencia: string): string => {
    return SEQUENCE_COLORS[sequencia] || 'bg-gradient-to-r from-gray-400 to-gray-600';
  }, []);

  // Filtros
  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.rota.toString().includes(searchTerm) || 
                         route.sequencia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || route.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Dados para gráficos
  const statusData: StatusData[] = [
    { name: 'Concluídas', value: routes.filter(r => r.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: 'Em Andamento', value: routes.filter(r => r.status === 'active').length, color: STATUS_COLORS.active },
    { name: 'Atrasadas', value: routes.filter(r => r.status === 'delayed').length, color: STATUS_COLORS.delayed },
    { name: 'Pendentes', value: routes.filter(r => r.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: 'Agendadas', value: routes.filter(r => r.status === 'scheduled').length, color: STATUS_COLORS.scheduled }
  ];

  const sequenceData: SequenceData[] = [
    '1ª ROTA', '2ª ROTA', '3ª ROTA', '4ª ROTA', '5ª ROTA', '6ª ROTA', '7ª ROTA'
  ].map(seq => ({
    name: seq,
    total: routes.filter(r => r.sequencia === seq).length,
    completed: routes.filter(r => r.sequencia === seq && r.status === 'completed').length
  }));

  const performanceData: PerformanceData[] = [
    { time: '00:00', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '00:00').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '00:00').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '00:00').length },
    { time: '03:00', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '03:00').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '03:00').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '03:00').length },
    { time: '06:00', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '06:00').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '06:00').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '06:00').length },
    { time: '16:00', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '16:00').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '16:00').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '16:00').length },
    { time: '19:30', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '19:30').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '19:30').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '19:30').length },
    { time: '21:30', completed: routes.filter(r => r.status === 'completed' && r.hrFinalizar <= '21:30').length, delayed: routes.filter(r => r.status === 'delayed' && r.hrFinalizar <= '21:30').length, active: routes.filter(r => r.status === 'active' && r.hrFinalizar <= '21:30').length }
  ];

  // Handlers
  const handleRouteStatusUpdate = useCallback(async (id: number, newStatus: RouteData['status']) => {
    const success = updateRoute(id, { status: newStatus });
    if (success) {
      setSyncMessage(`Status da rota ${id} atualizado para ${getStatusText(newStatus)}`);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  }, [updateRoute, getStatusText]);

  const handleDeleteRoute = useCallback(async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta rota?')) {
      const success = deleteRoute(id);
      if (success) {
        setSyncMessage(`Rota ${id} deletada`);
        setTimeout(() => setSyncMessage(''), 3000);
      }
    }
  }, [deleteRoute]);

  const handleModalSubmit = useCallback(async (routeData: Omit<RouteData, 'id'> | RouteData) => {
    if ('id' in routeData) {
      const success = updateRoute(routeData.id, routeData);
      if (success) {
        setSyncMessage(`Rota ${routeData.id} atualizada`);
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } else {
      const newId = addRoute(routeData);
      setSyncMessage(`Nova rota ${newId} criada`);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  }, [addRoute, updateRoute]);

  const handleSync = useCallback(async () => {
    setSyncMessage('Sincronizando com a planilha...');
    try {
      const result = await syncWithSheet();
      if (result.sucessos > 0) {
        setSyncMessage(`✅ ${result.sucessos} mudanças sincronizadas com sucesso!`);
      } else if (result.falhas > 0) {
        setSyncMessage(`⚠️ ${result.falhas} falhas na sincronização`);
      } else {
        setSyncMessage('Nenhuma mudança para sincronizar');
      }
    } catch (err) {
      setSyncMessage(`❌ Erro na sincronização: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setTimeout(() => setSyncMessage(''), 5000);
    }
  }, [syncWithSheet]);

  const handleReload = useCallback(async () => {
    setSyncMessage('Recarregando dados da planilha...');
    try {
      await reloadFromSheet();
      setSyncMessage('✅ Dados recarregados da planilha');
    } catch (err) {
      setSyncMessage(`❌ Erro ao recarregar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setTimeout(() => setSyncMessage(''), 3000);
    }
  }, [reloadFromSheet]);

  const handleTestConnection = useCallback(async () => {
    setSyncMessage('Testando conexão...');
    try {
      const result = await testConnection();
      if (result.success) {
        setSyncMessage('✅ Conexão com Google Apps Script funcionando!');
      } else {
        setSyncMessage(`❌ Falha no teste: ${result.details.error}`);
      }
    } catch (err) {
      setSyncMessage(`❌ Erro no teste: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setTimeout(() => setSyncMessage(''), 5000);
    }
  }, [testConnection]);

  // Cálculos de KPIs
  const stats = getStatistics();
  const completionRate = stats.taxaConclusao;
  const delayRate = stats.taxaAtraso;
  const activeRate = stats.taxaAtivos;

  const statsCards: StatCard[] = [
    { label: 'Taxa de Conclusão', value: completionRate, color: 'from-green-400 to-green-600', icon: Target },
    { label: 'Taxa de Atraso', value: delayRate, color: 'from-red-400 to-red-600', icon: AlertCircle },
    { label: 'Em Andamento', value: activeRate, color: 'from-blue-400 to-blue-600', icon: Activity },
    { label: 'Total de Rotas', value: routes.length, color: 'from-purple-400 to-purple-600', icon: BarChart3 }
  ];

  const summaryCards: StatCard[] = [
    { label: 'Total de Rotas', value: routes.length, color: 'from-blue-500 to-blue-600', icon: BarChart3 },
    { label: 'Concluídas', value: stats.completed, color: 'from-green-500 to-green-600', icon: CheckCircle },
    { label: 'Em Andamento', value: stats.active, color: 'from-blue-500 to-blue-600', icon: Activity },
    { label: 'Atrasadas', value: stats.delayed, color: 'from-red-500 to-red-600', icon: AlertCircle },
    { label: 'Pendentes', value: stats.pending, color: 'from-yellow-500 to-yellow-600', icon: Clock }
  ];

  // Renderizar indicador de conexão
  const renderConnectionStatus = () => {
    let icon, color, text;
    
    switch (connectionStatus) {
      case 'connected':
        icon = <Wifi className="w-5 h-5" />;
        color = 'text-green-200';
        text = 'Conectado';
        break;
      case 'disconnected':
        icon = <WifiOff className="w-5 h-5" />;
        color = 'text-yellow-200';
        text = 'Desconectado';
        break;
      default:
        icon = <CloudOff className="w-5 h-5" />;
        color = 'text-red-200';
        text = 'Offline';
    }
    
    return (
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-sm">{text}</span>
      </div>
    );
  };

  // Não renderizar até estar no cliente
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-white">SAÍDAS CD PA</h1>
              <p className="text-blue-100 text-lg">Sistema de Gerenciamento de Rotas</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Status de Conexão */}
              <div className="flex items-center gap-4">
                {renderConnectionStatus()}
                
                {/* Indicador de mudanças pendentes */}
                {hasPendingChanges && (
                  <div className="flex items-center gap-1 bg-yellow-500 bg-opacity-20 px-3 py-2 rounded-full">
                    <Upload className="w-4 h-4 text-yellow-200" />
                    <span className="text-sm text-yellow-200">{pendingChanges} pendente{pendingChanges > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-blue-100 text-sm">
                  {appCurrentTime.toLocaleDateString('pt-BR')}
                </div>
                <div className="text-2xl font-bold text-white">
                  {appCurrentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <Calendar className="w-10 h-10 text-blue-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Bar */}
        {(error || loading || syncMessage || hasPendingChanges) && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Erro: {error}</span>
                  <button
                    onClick={clearError}
                    className="ml-2 text-sm text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Processando...</span>
                </div>
              )}
              
              {syncMessage && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">{syncMessage}</span>
                </div>
              )}
              
              {lastUpdate && (
                <div className="text-sm text-gray-500">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-opacity-80 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold">
                      {stat.label.includes('Taxa') ? `${stat.value}%` : stat.value}
                    </p>
                  </div>
                  <IconComponent className="w-12 h-12 text-white text-opacity-60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Pizza - Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Status das Rotas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Barras - Sequências */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Performance por Sequência</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sequenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3B82F6" name="Total" />
                <Bar dataKey="completed" fill="#10B981" name="Concluídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Linha - Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Timeline de Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} name="Concluídas" />
              <Line type="monotone" dataKey="delayed" stroke="#EF4444" strokeWidth={3} name="Atrasadas" />
              <Line type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={3} name="Em Andamento" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Filtros e Controles */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por rota ou sequência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg w-full sm:w-64 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="all">Todos os Status</option>
                <option value="scheduled">Agendadas</option>
                <option value="active">Em Andamento</option>
                <option value="pending">Pendentes</option>
                <option value="delayed">Atrasadas</option>
                <option value="completed">Concluídas</option>
              </select>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Nova Rota
              </button>
              
              {/* Botão de Teste de Conexão */}
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                Testar API
              </button>
              
              {/* Botão de Sincronização */}
              <button
                onClick={handleSync}
                disabled={loading || !hasPendingChanges}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {loading ? 'Sincronizando...' : 'Sincronizar'}
                {hasPendingChanges && !loading && (
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {pendingChanges}
                  </span>
                )}
              </button>
              
              {/* Botão de Recarregar */}
              <button
                onClick={handleReload}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-5 h-5" />
                )}
                Recarregar
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Rotas */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Sequência
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Rota
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Finalizar
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Conferência
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${getSequenceColor(route.sequencia)}`}></div>
                        <span className="text-sm font-semibold text-gray-900">{route.sequencia}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{route.rota}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{route.hrFinalizar}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{route.hrConferencia}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(route.status)}`}>
                        {getStatusIcon(route.status)}
                        <span className="ml-1">{getStatusText(route.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingRoute(route);
                            setIsAddModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          aria-label="Editar rota"
                          title="Editar rota"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          aria-label="Excluir rota"
                          title="Excluir rota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {route.status !== 'completed' && (
                          <select
                            value={route.status}
                            onChange={(e) => handleRouteStatusUpdate(route.id, e.target.value as RouteData['status'])}
                            className="text-xs border-2 border-gray-200 rounded-lg px-3 py-1 focus:border-blue-500 focus:outline-none transition-colors"
                            aria-label="Alterar status da rota"
                            title="Alterar status"
                          >
                            <option value="scheduled">Agendada</option>
                            <option value="active">Em Andamento</option>
                            <option value="pending">Pendente</option>
                            <option value="delayed">Atrasada</option>
                            <option value="completed">Concluída</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mensagem quando não há rotas */}
          {filteredRoutes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">Nenhuma rota encontrada</div>
              <div className="text-gray-500 text-sm">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Clique em "Nova Rota" para começar'}
              </div>
            </div>
          )}
        </div>

        {/* Resumo Estatístico */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {summaryCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-opacity-80 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <IconComponent className="w-8 h-8 text-white text-opacity-60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Insights e Status da API */}
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Insights do Sistema</h3>
              <p className="text-indigo-100 mb-3">
                {delayRate > 20 ? '⚠️ Alto índice de atrasos detectado. Revisar processos.' : 
                 completionRate > 80 ? '✅ Excelente performance! Sistema funcionando bem.' : 
                 '📊 Performance dentro do esperado. Monitorar tendências.'}
              </p>
              
              {/* Informações adicionais */}
              <div className="flex flex-wrap gap-4 text-sm text-indigo-200">
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">Rotas Ativas:</span> {stats.active}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Agendadas:</span> {routes.filter(r => r.status === 'scheduled').length}
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Precisam Atenção:</span> {stats.delayed + stats.pending}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-indigo-200" />
                <div className="text-right">
                  <div className="text-sm text-indigo-200">Status da API</div>
                  <div className={`text-lg font-bold ${
                    connectionStatus === 'connected' ? 'text-green-200' :
                    connectionStatus === 'disconnected' ? 'text-yellow-200' : 'text-red-200'
                  }`}>
                    {connectionStatus === 'connected' ? 'Conectado' :
                     connectionStatus === 'disconnected' ? 'Desconectado' : 'Offline'}
                  </div>
                </div>
              </div>
              
              {hasPendingChanges && (
                <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  {pendingChanges} alteração{pendingChanges > 1 ? 'ões' : ''} pendente{pendingChanges > 1 ? 's' : ''}
                </div>
              )}
              
              {lastUpdate && (
                <div className="text-xs text-indigo-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Última sync: {lastUpdate.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debug Panel (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-800 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🔧 Painel de Debug
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">DEV</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-300 mb-2">Conexão:</div>
                <div className={`font-mono font-bold ${
                  connectionStatus === 'connected' ? 'text-green-400' :
                  connectionStatus === 'disconnected' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {connectionStatus.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-gray-300 mb-2">Mudanças Pendentes:</div>
                <div className="font-mono text-yellow-400 font-bold">{pendingChanges}</div>
              </div>
              <div>
                <div className="text-gray-300 mb-2">Total de Rotas:</div>
                <div className="font-mono text-blue-400 font-bold">{routes.length}</div>
              </div>
              <div>
                <div className="text-gray-300 mb-2">Taxa de Conclusão:</div>
                <div className="font-mono text-green-400 font-bold">{completionRate}%</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-4">
              <div className="flex flex-wrap gap-4">
                <div>Use <code className="bg-gray-700 px-1 rounded">window.debugRoutes</code> no console</div>
                <div>API Status: <span className="text-yellow-400">{apiStatus}</span></div>
                <div>Online: <span className={isOnline ? 'text-green-400' : 'text-red-400'}>{isOnline ? 'Sim' : 'Não'}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer com informações do sistema */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <div className="flex flex-wrap justify-center gap-4 items-center">
            <div>Sistema de Rotas CD PA v2.1</div>
            <div>•</div>
            <div>Última atualização: {lastUpdate ? lastUpdate.toLocaleDateString('pt-BR') : 'Nunca'}</div>
            <div>•</div>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AddRouteModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRoute(null);
        }}
        editingRoute={editingRoute}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default RouteManagementSystem;