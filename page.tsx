"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "@/config/axiosConfig";
import { isAxiosError } from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Download, 
  Eye, 
  Users, 
  CreditCard, 
  RefreshCw, 
  Search, 
  Edit2, 
  Plus,
  Minus,
  Calendar,
  Filter,
  Check,
  X,
  Play,
  UserCheck,
  UserX,
  Mail,
  Clock,
  Info,
  Building, // ✅ ДОБАВЛЕНО: Иконка для Legal
  User,      // ✅ ДОБАВЛЕНО: Иконка для Individual
  Shield,       // ✅ НОВОЕ: Иконка для риска
  FileText,     // ✅ НОВОЕ: Иконка для админских документов
  Upload,       // ✅ НОВОЕ: Иконка для загрузки
  Trash2,       // ✅ НОВОЕ: Иконка для удаления
  UserPlus,     // ✅ НОВОЕ: Иконка для назначения риска
  SortAsc,      // ✅ НОВОЕ: Иконка для сортировки
} from 'lucide-react';

// Добавить к существующим импортам
import { getAllUsersWithAnswers, getAllQuestions, UserWithAnswers, Question, QuestionOption } from "@/lib/api/kyc"; // укажите правильный путь
// Импортируем getBybitSubMembers и SubMember из файла bybit API
import { getBybitSubMembers, SubMember, getAllWithdrawal, WithdrawalRequest, WithdrawalResponse, Document, sendUserTemplateEmail } from "@/lib/api/bybit";

// ✅ НОВЫЕ ИМПОРТЫ для админского управления
import {
  getUserAdminDocuments,
  downloadFileWithName,
  uploadDocumentForUser,
  updateAdminDocumentStatus,
  deleteAdminDocument,
  getUserRisk,
  updateUserRisk,
  assignUserRisk,
  getRiskLevelDisplayName,
  getRiskLevelColorClass,
  validateRiskLevel,
  getUsersFromRiskTable, // ✅ НОВЫЙ ИМПОРТ
  AdminDocument,
  UserRisk,
  AdminDocumentUpload,
  UserRiskUpdate,
  UserRiskAssign,
  UserWithRisk, // ✅ НОВЫЙ ТИП
  isExcelFile, // ✅ НОВОЕ
  getSupportedFileFormats, // ✅ НОВОЕ
  getSupportedFileDescription, // ✅ НОВОЕ
} from "@/lib/api/admin_management";

// Определение интерфейса для объекта документа
interface SubMemberDocument {
  id: string;
  user_id: string;
  file_path: string;
  document_type: string;
  uploaded_at: string;
  status: string;
  download_url: string;
  reason?: string | null;
}

// ✅ НОВЫЕ ТИПЫ для фильтрации рисков
type RiskFilterType = 'ALL' | 'NOT_ASSIGNED' | 'LOW' | 'MEDIUM' | 'HIGH';

const SubaccountPage = () => {

  // Добавить после существующих useState
  const [surveyAnswers, setSurveyAnswers] = useState<UserWithAnswers[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<Question[]>([]);
  const [loadingSurveyData, setLoadingSurveyData] = useState(false);
  const [pdlQuestionId, setPdlQuestionId] = useState<string | null>(null);
  // Состояния для таблицы Bybit Саб-аккаунтов
  const [subMembers, setSubMembers] = useState<SubMember[]>([]);
  const [loadingSubMembers, setLoadingSubMembers] = useState(true);
  const [errorSubMembers, setErrorSubMembers] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // ✅ НОВЫЕ СОСТОЯНИЯ для пользователей из таблицы рисков
  const [usersWithRisks, setUsersWithRisks] = useState<UserWithRisk[]>([]);
  const [loadingUsersWithRisks, setLoadingUsersWithRisks] = useState(false);

  // ✅ НОВЫЕ СОСТОЯНИЯ для админских документов
  const [showingAdminDocsForUid, setShowingAdminDocsForUid] = useState<string | null>(null);
  const [adminDocuments, setAdminDocuments] = useState<Record<string, AdminDocument[]>>({});
  const [loadingAdminDocs, setLoadingAdminDocs] = useState<string | null>(null);
  const [downloadingAdminDocId, setDownloadingAdminDocId] = useState<string | null>(null);
  const [uploadingDocForUserId, setUploadingDocForUserId] = useState<string | null>(null);

  // ✅ НОВЫЕ СОСТОЯНИЯ для управления рисками
  const [userRisks, setUserRisks] = useState<Record<string, UserRisk>>({});
  const [loadingRiskForUserId, setLoadingRiskForUserId] = useState<string | null>(null);
  const [editingRiskForUserId, setEditingRiskForUserId] = useState<string | null>(null);
  const [assigningRiskForUserId, setAssigningRiskForUserId] = useState<string | null>(null);
  const [riskEditData, setRiskEditData] = useState<{ risk_level: string; reason: string }>({
    risk_level: 'low', // ✅ FIXED: Default to valid value instead of 'select'
    reason: ''
  });

  // ✅ НОВОЕ СОСТОЯНИЕ: Фильтр по типу пользователя
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'LEGAL'>('ALL');

  // ✅ НОВОЕ СОСТОЯНИЕ: Фильтр по уровню риска
  const [riskFilter, setRiskFilter] = useState<RiskFilterType>('ALL');

  // Состояния для таблицы Запросов на вывод средств (Withdrawal)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // Состояния для управления редактированием статуса вывода
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [currentStatusSelection, setCurrentStatusSelection] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  // Новое состояние для обработки крипто-вывода
  const [processingCryptoRequestId, setProcessingCryptoRequestId] = useState<string | null>(null);

  // Состояние для управления отображением документов саб-аккаунтов
  const [showingDocsForUid, setShowingDocsForUid] = useState<string | null>(null);
  // Состояние для управления отображением информации о пользователе
  const [showingUserInfoForUid, setShowingUserInfoForUid] = useState<string | null>(null);

  // Состояние для управления блокировкой кнопок верификации (блокируем по document_id)
  const [verifyingUserDocId, setVerifyingUserDocId] = useState<string | null>(null);

  // Состояние для отслеживания загрузки документа
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  // Состояние для управления видимостью модального окна отклонения верификации
  // Состояние для ID **пользователя**, верификация которого отклоняется
  const [userToRejectId, setUserToRejectId] = useState<string | null>(null);
  // Состояние для причины отклонения
  const [rejectReason, setRejectReason] = useState('');

  // НОВЫЕ СОСТОЯНИЯ: для фильтрации по дате
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // НОВОЕ СОСТОЯНИЕ: Для отслеживания операций заморозки/разморозки
  const [processingFreezeUnfreezeUid, setProcessingFreezeUnfreezeUid] = useState<string | null>(null);

  // Добавьте новые состояния после существующих useState
  const [subaccountSearch, setSubaccountSearch] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');

  // НОВЫЕ СОСТОЯНИЯ ДЛЯ EMAIL: ✅ ИСПРАВЛЕНО - убираем readonly
  const [emailLoading, setEmailLoading] = useState<string | null>(null);

  // НОВЫЕ СОСТОЯНИЯ ДЛЯ МОДАЛЬНОГО ОКНА ДЕТАЛЕЙ ЗАПРОСА НА ВЫВОД
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState<WithdrawalRequest | null>(null);
  const [showWithdrawalDetailsModal, setShowWithdrawalDetailsModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ НОВАЯ ФУНКЦИЯ для загрузки пользователей с рисками
  const fetchUsersWithRisks = useCallback(async () => {
    try {
      setLoadingUsersWithRisks(true);
      const risksData = await getUsersFromRiskTable();
      setUsersWithRisks(risksData);
    } catch (error) {
      console.error('Error fetching users with risks:', error);
      toast.error('Ошибка загрузки данных о рисках');
    } finally {
      setLoadingUsersWithRisks(false);
    }
  }, []);

  // ✅ НОВАЯ ФУНКЦИЯ для получения риска пользователя из таблицы рисков
  const getUserRiskFromTable = (userId: string) => {
    return usersWithRisks.find(userRisk => userRisk.user_id === userId);
  };

  // ✅ ФУНКЦИЯ проверки наличия назначенного риска
  const hasAssignedRisk = (userId: string): boolean => {
    return usersWithRisks.some(userRisk => userRisk.user_id === userId);
  };

  // ✅ ОБНОВЛЕННЫЙ useMemo: для фильтрации субаккаунтов с учетом user_type и риска
  const filteredSubMembers = useMemo(() => {
    let filtered = subMembers.filter(m => {
      // Исключаем администраторов
      if (m.role?.name === "Администратор") {
        return false;
      }
      // Оставляем только тех, у кого есть хотя бы один Bybit-клиент
      return m.clients && m.clients.length > 0;
    });

    // ✅ ФИЛЬТР: Фильтрация по типу пользователя
    if (userTypeFilter !== 'ALL') {
      filtered = filtered.filter(member => member.user_type === userTypeFilter);
    }

    // ✅ НОВЫЙ ФИЛЬТР: Фильтрация по уровню риска
    if (riskFilter !== 'ALL') {
      filtered = filtered.filter(member => {
        const userRiskFromTable = getUserRiskFromTable(member.id);
        
        switch (riskFilter) {
          case 'NOT_ASSIGNED':
            return !userRiskFromTable; // Нет данных в таблице рисков
          case 'LOW':
            return userRiskFromTable?.risk_level === 'low';
          case 'MEDIUM':
            return userRiskFromTable?.risk_level === 'medium';
          case 'HIGH':
            return userRiskFromTable?.risk_level === 'high';
          default:
            return true;
        }
      });
    }

    // Добавляем поиск по введенному тексту
    if (subaccountSearch) {
      const searchLower = subaccountSearch.toLowerCase();
      filtered = filtered.filter(member => {
        return (
          // Поиск по имени и фамилии
          `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchLower) ||
          // Поиск по ID
          member.id?.toString().toLowerCase().includes(searchLower) ||
          // Поиск по email
          member.email?.toLowerCase().includes(searchLower) ||
          // Поиск по username
          member.username?.toLowerCase().includes(searchLower) ||
          // Поиск по Bybit SubUID
          member.clients?.some(client => 
            client.subuid?.toString().toLowerCase().includes(searchLower)
          )
        );
      });
    }

    return filtered;
  }, [subMembers, subaccountSearch, userTypeFilter, riskFilter, usersWithRisks]);

  // НОВЫЙ useMemo: для фильтрации запросов на вывод средств по дате
  const filteredWithdrawalRequests = useMemo(() => {
    let filtered = withdrawalRequests;

    // Сначала применяем фильтр по датам
    if (startDate) {
      const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(request => {
        const requestTimestamp = new Date(request.created_at).getTime();
        return requestTimestamp >= startTimestamp;
      });
    }

    if (endDate) {
      const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(request => {
        const requestTimestamp = new Date(request.created_at).getTime();
        return requestTimestamp <= endTimestamp;
      });
    }

    // Затем применяем поиск по тексту
    if (withdrawalSearch) {
      const searchLower = withdrawalSearch.toLowerCase();
      filtered = filtered.filter(request => {
        // Находим пользователя по ID для поиска по имени и Bybit ID
        const user = subMembers.find(member => member.id === request.user_id);
        
        // Формируем строку имени пользователя
        const userName = user ? `${user.first_name} ${user.last_name}`.toLowerCase() : '';
        
        // Получаем Bybit ID пользователя
        const bybitIds = user?.clients?.map(client => client.subuid?.toString().toLowerCase() || '').join(' ') || '';

        return (
          request.id?.toString().toLowerCase().includes(searchLower) ||
          request.user_id?.toString().toLowerCase().includes(searchLower) ||
          request.service?.toLowerCase().includes(searchLower) ||
          request.currency?.toLowerCase().includes(searchLower) ||
          request.status?.toLowerCase().includes(searchLower) ||
          userName.includes(searchLower) ||
          bybitIds.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [withdrawalRequests, startDate, endDate, withdrawalSearch, subMembers]);

  // ✅ ОБНОВЛЕННАЯ функция для подсчета статистики с учетом типов пользователей и рисков
  const getStats = () => {
    const totalUsers = filteredSubMembers.length;
    const activeUsers = filteredSubMembers.filter(member => 
      member.clients && member.clients.length > 0 && member.clients[0].status === 'ACTIVE'
    ).length;
    const verifiedUsers = filteredSubMembers.filter(member => 
      member.verification_level_id === 3
    ).length;
    const pendingVerification = filteredSubMembers.filter(member => 
      member.verification_level_id === 2
    ).length;

    // ✅ СТАТИСТИКА: Подсчет по типам пользователей
    const individualUsers = subMembers.filter(member => 
      member.user_type === 'INDIVIDUAL' && member.role?.name !== "Администратор" && member.clients?.length > 0
    ).length;
    const legalUsers = subMembers.filter(member => 
      member.user_type === 'LEGAL' && member.role?.name !== "Администратор" && member.clients?.length > 0
    ).length;

    // ✅ НОВАЯ СТАТИСТИКА: Подсчет по уровням риска
    const allUsersWithClients = subMembers.filter(member => 
      member.role?.name !== "Администратор" && member.clients?.length > 0
    );
    
    const riskStats = {
      notAssigned: allUsersWithClients.filter(member => !getUserRiskFromTable(member.id)).length,
      low: allUsersWithClients.filter(member => getUserRiskFromTable(member.id)?.risk_level === 'low').length,
      medium: allUsersWithClients.filter(member => getUserRiskFromTable(member.id)?.risk_level === 'medium').length,
      high: allUsersWithClients.filter(member => getUserRiskFromTable(member.id)?.risk_level === 'high').length,
    };

    return { 
      totalUsers, 
      activeUsers, 
      verifiedUsers, 
      pendingVerification, 
      individualUsers, 
      legalUsers,
      riskStats
    };
  };

  const stats = getStats();

  // Функция для загрузки Bybit Саб-аккаунтов (используем useCallback для стабильности)
  const fetchSubMembersData = useCallback(async () => {
    try {
      setLoadingSubMembers(true);
      const subData = await getBybitSubMembers();
      console.log("DEBUG: Raw sub-member data from API:", subData);
      setSubMembers(subData);
      setErrorSubMembers(null);
    } catch (err: unknown) {
      let errorMessage: string;
      if (isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message || 'Ошибка при получении саб-аккаунтов.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Произошла неизвестная ошибка при получении саб-аккаунтов.';
      }
      console.error("Error fetching sub-members:", errorMessage, err);
      setErrorSubMembers(errorMessage);
    } finally {
      setLoadingSubMembers(false);
    }
  }, []);

  // Функция для загрузки Запросов на вывод средств (используем useCallback для стабильности)
  const fetchAllWithdrawalRequests = useCallback(async () => {
    try {
      setLoadingWithdrawals(true);
      setWithdrawalError(null);
      const response: WithdrawalResponse = await getAllWithdrawal();
      setWithdrawalRequests(response.withdrawal_requests);
    } catch (err: unknown) {
      let currentWithdrawalError: string;
      if (isAxiosError(err)) {
        currentWithdrawalError = err.response?.data?.detail || err.message || 'Ошибка при загрузке запросов на вывод.';
      } else if (err instanceof Error) {
        currentWithdrawalError = err.message;
      } else {
        currentWithdrawalError = 'Произошла неизвестная ошибка при загрузке запросов на вывод.';
      }
      console.error("Error fetching withdrawal requests:", currentWithdrawalError, err);
      setWithdrawalError(currentWithdrawalError);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, []);

  // ✅ НОВЫЕ ФУНКЦИИ для работы с админскими документами
  
  const handleViewAdminDocuments = async (member: SubMember) => {
    console.log('handleViewAdminDocuments called for member:', member.id); // ✅ ДОБАВЛЕН DEBUG LOG
    
    if (showingAdminDocsForUid === member.id) {
      setShowingAdminDocsForUid(null);
      return;
    }

    setShowingAdminDocsForUid(member.id);
    setShowingDocsForUid(null);
    setShowingUserInfoForUid(null);

    if (!adminDocuments[member.id]) {
      setLoadingAdminDocs(member.id);
      try {
        const docs = await getUserAdminDocuments(member.id);
        setAdminDocuments(prev => ({ ...prev, [member.id]: docs }));
        console.log('Admin documents loaded:', docs); // ✅ ДОБАВЛЕН DEBUG LOG
      } catch (error) {
        console.error('Error loading admin documents:', error);
        toast.error('Ошибка загрузки админских документов');
      } finally {
        setLoadingAdminDocs(null);
      }
    }
  };

  const handleDownloadAdminDocument = async (doc: AdminDocument) => {
    setDownloadingAdminDocId(doc.id);
    try {
      await downloadFileWithName(doc.id, doc.original_filename, doc.document_type);
      toast.success('Документ успешно скачан');
    } catch (error) {
      console.error('Error downloading admin document:', error);
      toast.error('Ошибка при скачивании документа');
    } finally {
      setDownloadingAdminDocId(null);
    }
  };

  const handleUploadDocumentForUser = async (userId: string, file: File, documentType: string, notes: string) => {
    setUploadingDocForUserId(userId);
    try {
      // ✅ НОВАЯ ПРОВЕРКА: Проверяем тип файла
      if (isExcelFile(file)) {
        console.log('Uploading Excel file:', file.name, 'Size:', file.size, 'bytes');
        
        // Предупреждение для больших Excel файлов
        if (file.size > 10 * 1024 * 1024) { // 10MB
          const confirmUpload = confirm(
            `Файл ${file.name} довольно большой (${(file.size / 1024 / 1024).toFixed(2)} MB). ` +
            'Загрузка может занять некоторое время. Продолжить?'
          );
          if (!confirmUpload) {
            return;
          }
        }
      }

      const uploadData: AdminDocumentUpload = {
        file,
        document_type: documentType,
        notes: notes.trim() || undefined
      };

      const newDoc = await uploadDocumentForUser(userId, uploadData);
      
      setAdminDocuments(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), newDoc]
      }));

      // ✅ ОБНОВЛЕННОЕ СООБЩЕНИЕ с информацией о типе файла
      const fileTypeInfo = isExcelFile(file) ? ' (Excel файл)' : '';
      toast.success(`Документ успешно загружен${fileTypeInfo}`);
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // ✅ УЛУЧШЕННАЯ ОБРАБОТКА ОШИБОК для Excel файлов
      if (isAxiosError(error) && error.code === 'ECONNABORTED') {
        toast.error('Превышено время ожидания загрузки. Попробуйте загрузить файл меньшего размера.');
      } else if (isAxiosError(error) && error.response?.status === 413) {
        toast.error('Файл слишком большой. Максимальный размер файла: 50MB');
      } else {
        toast.error('Ошибка при загрузке документа');
      }
    } finally {
      setUploadingDocForUserId(null);
    }
  };

  // ✅ НОВЫЕ ФУНКЦИИ для работы с рисками

  const handleViewUserRisk = async (member: SubMember) => {
    if (!userRisks[member.id]) {
      setLoadingRiskForUserId(member.id);
      try {
        const risk = await getUserRisk(member.id);
        setUserRisks(prev => ({ ...prev, [member.id]: risk }));
      } catch (error) {
        console.error('Error loading user risk:', error);
        setUserRisks(prev => ({ 
          ...prev, 
          [member.id]: {
            id: '',
            user_id: member.id,
            risk_level: member.risk_level || 'select',
            assigned_by_admin_id: '',
            assigned_at: '',
            created_at: '',
            updated_at: ''
          }
        }));
      } finally {
        setLoadingRiskForUserId(null);
      }
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ для назначения риска
  const handleAssignRisk = (member: SubMember) => {
    setAssigningRiskForUserId(member.id);
    setRiskEditData({
      risk_level: 'low',
      reason: ''
    });
  };

  // ✅ НОВАЯ ФУНКЦИЯ для сохранения назначенного риска
  const handleSaveAssignedRisk = async (userId: string) => {
    try {
      // ✅ ADD VALIDATION: Check if valid risk level is selected
      if (!riskEditData.risk_level || riskEditData.risk_level === 'select') {
        toast.error('Пожалуйста, выберите корректный уровень риска');
        return;
      }

      // ✅ ADD VALIDATION: Ensure risk_level is one of the allowed values
      if (!validateRiskLevel(riskEditData.risk_level)) {
        toast.error('Недопустимый уровень риска');
        return;
      }

      const assignData: UserRiskAssign = {
        risk_level: riskEditData.risk_level as 'low' | 'medium' | 'high',
        reason: riskEditData.reason.trim() || undefined
      };

      console.log('Assigning risk data:', assignData);

      const assignedRisk = await assignUserRisk(userId, assignData);
      
      // ✅ ОБНОВИТЬ: Обновляем локальные данные о рисках
      setUserRisks(prev => ({ ...prev, [userId]: assignedRisk }));
      
      // ✅ ДОБАВИТЬ: Перезагружаем данные из таблицы рисков
      await fetchUsersWithRisks();
      await fetchSubMembersData();
      
      setAssigningRiskForUserId(null);
      toast.success('Риск успешно назначен');
    } catch (error) {
      console.error('Error assigning user risk:', error);
      
      // ✅ BETTER ERROR HANDLING
      if (isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при назначении риска';
        toast.error(errorMessage);
      } else {
        toast.error('Ошибка при назначении риска');
      }
    }
  };

  const handleEditRisk = (member: SubMember) => {
    // ✅ ИЗМЕНЕНО: Получаем риск из таблицы рисков
    const userRiskFromTable = getUserRiskFromTable(member.id);
    const currentRisk = userRiskFromTable || userRisks[member.id] || { risk_level: member.risk_level || 'select', reason: '' };
    
    setEditingRiskForUserId(member.id);
    
    // ✅ FIXED: Ensure we don't start with 'select' for editing
    setRiskEditData({
      risk_level: currentRisk.risk_level === 'select' ? 'low' : currentRisk.risk_level,
      reason: currentRisk.reason || currentRisk.reason || ''
    });
  };

  // ✅ ОБНОВЛЕНО: Updated handleSaveRisk function with proper validation
  const handleSaveRisk = async (userId: string) => {
    try {
      // ✅ ADD VALIDATION: Check if valid risk level is selected
      if (!riskEditData.risk_level || riskEditData.risk_level === 'select') {
        toast.error('Пожалуйста, выберите корректный уровень риска');
        return;
      }

      // ✅ ADD VALIDATION: Ensure risk_level is one of the allowed values
      if (!validateRiskLevel(riskEditData.risk_level)) {
        toast.error('Недопустимый уровень риска');
        return;
      }

      const updateData: UserRiskUpdate = {
        risk_level: riskEditData.risk_level as 'low' | 'medium' | 'high',
        reason: riskEditData.reason.trim() || undefined
      };

      console.log('Sending risk update data:', updateData);

      const updatedRisk = await updateUserRisk(userId, updateData);
      
      // ✅ ОБНОВИТЬ: Обновляем локальные данные о рисках
      setUserRisks(prev => ({ ...prev, [userId]: updatedRisk }));
      
      // ✅ ДОБАВИТЬ: Перезагружаем данные из таблицы рисков
      await fetchUsersWithRisks();
      await fetchSubMembersData();
      
      setEditingRiskForUserId(null);
      toast.success('Риск успешно обновлен');
    } catch (error) {
      console.error('Error updating user risk:', error);
      
      // ✅ BETTER ERROR HANDLING
      if (isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при обновлении риска';
        toast.error(errorMessage);
      } else {
        toast.error('Ошибка при обновлении риска');
      }
    }
  };

  const handleCancelRiskEdit = () => {
    setEditingRiskForUserId(null);
    setAssigningRiskForUserId(null);
    setRiskEditData({ risk_level: 'low', reason: '' }); // ✅ FIXED: Reset to valid value
  };

  // ✅ ОБНОВЛЕНО: useEffect для запуска загрузки данных
  useEffect(() => {
    if (!mounted) return;
    
    fetchSubMembersData();
    fetchUsersWithRisks(); // ✅ ДОБАВИТЬ этот вызов

    const intervalId = setInterval(() => {
      fetchSubMembersData();
      fetchUsersWithRisks(); // ✅ ДОБАВИТЬ этот вызов
    }, 20000);

    return () => clearInterval(intervalId);
  }, [fetchSubMembersData, fetchUsersWithRisks, mounted]);

  // useEffect для запуска загрузки Запросов на вывод средств и установки интервала
  useEffect(() => {
    if (!mounted) return;
    
    fetchAllWithdrawalRequests();

    const intervalId = setInterval(() => {
      fetchAllWithdrawalRequests();
    }, 20000);

    return () => clearInterval(intervalId);
  }, [fetchAllWithdrawalRequests, mounted]);

  // В существующем useEffect загружаем риски для отображаемых пользователей
  useEffect(() => {
    if (filteredSubMembers.length > 0) {
      filteredSubMembers.forEach(member => {
        if (!userRisks[member.id]) {
          handleViewUserRisk(member);
        }
      });
    }
  }, [filteredSubMembers]);

  

  // Обработчики для изменения статуса вывода
  const handleEditClick = (request: WithdrawalRequest) => {
    setEditingRequestId(request.id);
    setCurrentStatusSelection(request.status);
    setAdminNotes(request.admin_notes || '');
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentStatusSelection(e.target.value);
    if (e.target.value !== 'REJECTED') {
      setAdminNotes('');
    }
  };

  const handleAdminNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdminNotes(e.target.value);
  };

  const handleCancelEdit = () => {
    setEditingRequestId(null);
    setCurrentStatusSelection('');
    setAdminNotes('');
  };

  const handleSaveStatus = async () => {
    if (!editingRequestId) return;

    if (currentStatusSelection === 'REJECTED' && !adminNotes.trim()) {
      console.warn('Причина отклонения обязательна для статуса REJECTED.');
      return;
    }

    setSubmittingStatus(true);
    try {
      const payload = {
        status: currentStatusSelection,
        admin_notes: adminNotes.trim() === '' ? undefined : adminNotes
      };

      await axios.put(`/v1/withdrawal/admin/withdrawal-request/${editingRequestId}`, payload);

      handleCancelEdit();
      fetchAllWithdrawalRequests();
    } catch (err: unknown) {
      let currentErrorMessage: string;
      if (isAxiosError(err)) {
        currentErrorMessage = err.response?.data?.detail || err.message || 'Ошибка при обновлении статуса.';
      } else if (err instanceof Error) {
        currentErrorMessage = err.message;
      } else {
        currentErrorMessage = 'Произошла неизвестная ошибка при обновлении статуса.';
      }
      console.error("Error updating withdrawal status:", currentErrorMessage);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleProcessCryptoWithdrawal = async (requestId: string) => {
    setProcessingCryptoRequestId(requestId);
    try {
      await axios.post(`/v1/withdrawal/withdrawal-request/${requestId}/process-crypto`);
      console.log(`Запрос на обработку крипто-вывода для ${requestId} успешно отправлен.`);
      fetchAllWithdrawalRequests();
    } catch (err: unknown) {
      let errorMessage: string;
      if (isAxiosError(err)) {
          errorMessage = err.response?.data?.detail || err.message || 'Ошибка при обработке крипто-вывода.';
      } else if (err instanceof Error) {
          errorMessage = err.message;
      } else {
          errorMessage = 'Произошла неизвестная ошибка при обработке крипто-вывода.';
      }
      console.error("Error processing crypto withdrawal:", errorMessage, err);
    } finally {
      setProcessingCryptoRequestId(null);
    }
  };

  const handleViewDocuments = (member: SubMember) => {
    if (showingDocsForUid === member.id) {
      setShowingDocsForUid(null);
    } else {
      setShowingDocsForUid(member.id);
      setShowingUserInfoForUid(null);
      setShowingAdminDocsForUid(null);
    }
  };

  const handleAboutUserClick = (member: SubMember) => {
    if (showingUserInfoForUid === member.id) {
      setShowingUserInfoForUid(null);
    } else {
      setShowingUserInfoForUid(member.id);
      setShowingDocsForUid(null);
      setShowingAdminDocsForUid(null);
    }
  };

  const handleViewWithdrawalDetails = (request: WithdrawalRequest) => {
    setSelectedWithdrawalRequest(request);
    setShowWithdrawalDetailsModal(true);
  };

  const handleCloseWithdrawalDetailsModal = () => {
    setSelectedWithdrawalRequest(null);
    setShowWithdrawalDetailsModal(false);
  };

  const displayWithdrawalAmount = (amount: string | number) => {
    if (!amount || amount === '') return '0';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const correctedAmount = numAmount;
    return correctedAmount.toString();
  };

  const handleDownloadDocument = async (doc: SubMemberDocument) => {
    setDownloadingDocId(doc.id);
    try {
      let downloadUrl = doc.download_url;
      
      if (downloadUrl.includes('localhost:8080')) {
        downloadUrl = downloadUrl.replace('http://localhost:8080', 'https://api.apola-finance.kz');
      }
      
      if (downloadUrl.includes('127.0.0.1:8080')) {
        downloadUrl = downloadUrl.replace('http://127.0.0.1:8080', 'https://api.apola-finance.kz');
      }
      
      console.log('Original URL:', doc.download_url);
      console.log('Modified URL:', downloadUrl);

      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
      });

      const mimeType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let fileExtension = '';
      switch (mimeType) {
        case 'application/pdf': fileExtension = '.pdf'; break;
        case 'image/jpeg': fileExtension = '.jpg'; break;
        case 'image/png': fileExtension = '.png'; break;
        case 'image/gif': fileExtension = '.gif'; break;
        case 'text/plain': fileExtension = '.txt'; break;
        case 'application/msword': fileExtension = '.doc'; break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': fileExtension = '.docx'; break;
        case 'application/vnd.ms-excel': fileExtension = '.xls'; break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': fileExtension = '.xlsx'; break;
        case 'video/mp4': fileExtension = '.mp4'; break;
        case 'audio/mpeg': fileExtension = '.mp3'; break;
        default:
          const urlParts = doc.download_url.split('.');
          if (urlParts.length > 1 && urlParts[urlParts.length - 1].length <= 5 && !urlParts[urlParts.length - 1].includes('/')) {
            fileExtension = `.${urlParts.pop()}`;
          } else {
            fileExtension = '';
          }
          break;
      }

      const baseFilename = doc.document_type ? doc.document_type.replace(/\s+/g, '_') : `document_${doc.id.substring(0, 8)}`;
      link.setAttribute('download', `${baseFilename}${fileExtension}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      let currentErrorMessage: string;
      if (isAxiosError(error)) {
        currentErrorMessage = error.response?.data?.detail || error.message || 'Ошибка при загрузке документа.';
      } else if (error instanceof Error) {
        currentErrorMessage = error.message;
      } else {
        currentErrorMessage = 'Произошла неизвестная ошибка при загрузке документа.';
      }
      console.error("Error downloading document:", currentErrorMessage, error);
      alert(currentErrorMessage);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleApproveVerification = async (userId: string) => {
    setVerifyingUserDocId(userId); 
    setEmailLoading(`approve-${userId}`); // ✅ ИСПРАВЛЕНО
    try {
      const payload = { 
        status: "approved", 
        reason: null 
      };
      
      await axios.patch(`/v1/documents/user/${userId}/verification-status`, payload);
      console.log(`Верификация пользователя ${userId} утверждена.`);
      
      try {
        await sendUserTemplateEmail({
          user_id: userId,
          template_type: 'verification_approved',
          custom_data: {}
        });
        console.log(`Email уведомление об утверждении отправлено пользователю ${userId}`);
      } catch (emailError) {
        console.error('Ошибка отправки email при утверждении:', emailError);
      }
      
      setShowingDocsForUid(null);
      await fetchSubMembersData();
    } catch (err: unknown) {
      let currentErrorMessage: string;
      if (isAxiosError(err)) {
        currentErrorMessage = err.response?.data?.detail || err.message || 'Ошибка при утверждении верификации.';
      } else if (err instanceof Error) {
        currentErrorMessage = err.message;
      } else {
        currentErrorMessage = 'Произошла неизвестная ошибка при утверждении верификации.';
      }
      console.error("Error approving verification:", currentErrorMessage, err);
    } finally {
      setVerifyingUserDocId(null);
      setEmailLoading(null); // ✅ ИСПРАВЛЕНО
    }
  };

  const handleDenyVerification = async (userId: string, reason: string) => {
    setVerifyingUserDocId(userId);
    setEmailLoading(`reject-${userId}`); // ✅ ИСПРАВЛЕНО
    try {
      const payload = { 
        status: "rejected", 
        reason: reason 
      };
      
      await axios.patch(`/v1/documents/user/${userId}/verification-status`, payload);
      console.log(`Верификация пользователя ${userId} отклонена.`);
      
      try {
        await sendUserTemplateEmail({
          user_id: userId,
          template_type: 'verification_rejected',
          custom_data: {},
          rejection_reason: reason
        });
        console.log(`Email уведомление об отклонении отправлено пользователю ${userId}`);
      } catch (emailError) {
        console.error('Ошибка отправки email при отклонении:', emailError);
      }
      
      setShowingDocsForUid(null);
      await fetchSubMembersData();
    } catch (err: unknown) {
      let currentErrorMessage: string;
      if (isAxiosError(err)) {
        currentErrorMessage = err.response?.data?.detail || err.message || 'Ошибка при отклонении верификации.';
      } else if (err instanceof Error) {
        currentErrorMessage = err.message;
      } else {
        currentErrorMessage = 'Произошла неизвестная ошибка при отклонении верификации.';
      }
      console.error("Error denying verification:", currentErrorMessage, err);
    } finally {
      setVerifyingUserDocId(null);
      setEmailLoading(null); // ✅ ИСПРАВЛЕНО
    }
  };

  const handleOpenRejectModal = (userId: string) => {
    setUserToRejectId(userId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setIsRejectModalOpen(false);
    setUserToRejectId(null);
    setRejectReason('');
  };

  const handleModalReject = async () => {
    if (!userToRejectId || !rejectReason.trim()) {
      console.warn('ID пользователя и причина отклонения обязательны.');
      return;
    }
    
    await handleDenyVerification(userToRejectId, rejectReason);
    
    handleCloseRejectModal();
  };

  const findPDLQuestion = useCallback((questions: Question[]): Question | null => {
    const pdlKeywords = ["являетесь ли вы или члены вашей семьи пдл", "пдл"];
    
    return questions.find(question => {
      const questionText = question.text.toLowerCase().trim();
      return pdlKeywords.some(keyword => questionText.includes(keyword));
    }) || null;
  }, []);

  const getPDLAnswerForUser = useCallback((userId: string): { answer: string | null, status: string } => {
    if (!pdlQuestionId) {
      return { answer: null, status: 'no_question' };
    }

    const userAnswers = surveyAnswers.find(user => user.user_id === userId);
    if (!userAnswers) {
      return { answer: null, status: 'no_answers' };
    }

    const pdlAnswer = userAnswers.answers.find(answer => answer.question_id === pdlQuestionId);
    if (!pdlAnswer) {
      return { answer: null, status: 'no_answer' };
    }

    let answerText: string | null = null;
    
    if (pdlAnswer.selected_option_text) {
      answerText = pdlAnswer.selected_option_text;
    } else if (pdlAnswer.custom_answer) {
      answerText = pdlAnswer.custom_answer;
    } else {
      answerText = 'Не указано';
    }

    return {
      answer: answerText,
      status: pdlAnswer.status
    };
  }, [surveyAnswers, pdlQuestionId]);



  // Добавить после существующих функций
  const fetchSurveyData = useCallback(async () => {
    try {
      setLoadingSurveyData(true);
      const [answersData, questionsData] = await Promise.all([
        getAllUsersWithAnswers(),
        getAllQuestions()
      ]);
      
      setSurveyAnswers(answersData);
      setSurveyQuestions(questionsData);
      
      // Находим вопрос про ПДЛ
      const pdlQuestion = findPDLQuestion(questionsData);
      if (pdlQuestion) {
        setPdlQuestionId(pdlQuestion.id);
        console.log('Found PDL question:', pdlQuestion.text);
      } else {
        console.log('PDL question not found');
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
      toast.error('Ошибка загрузки данных опроса');
    } finally {
      setLoadingSurveyData(false);
    }
  }, [findPDLQuestion]);


  useEffect(() => {
    if (!mounted) return;
    
    fetchSubMembersData();
    fetchUsersWithRisks();
    fetchSurveyData(); // ✅ ДОБАВИТЬ этот вызов

    const intervalId = setInterval(() => {
      fetchSubMembersData();
      fetchUsersWithRisks();
      fetchSurveyData(); // ✅ ДОБАВИТЬ этот вызов
    }, 20000);

    return () => clearInterval(intervalId);
  }, [fetchSubMembersData, fetchUsersWithRisks, fetchSurveyData, mounted]);

  const handleFreezeUnfreezeSubaccount = async (subUid: string, freeze: boolean) => {
    setProcessingFreezeUnfreezeUid(subUid);
    setEmailLoading(`${freeze ? 'freeze' : 'unfreeze'}-${subUid}`); // ✅ ИСПРАВЛЕНО
    try {
      const payload = {
        subuid: subUid,
        frozen: freeze ? "1" : "0",
      };
      await axios.post(`/v1/clients/froze-subuid`, payload);
      console.log(`Субаккаунт ${subUid} успешно ${freeze ? 'заморожен' : 'разморожен'}.`);
      
      try {
        const user = subMembers.find(member => 
          member.clients?.some(client => client.subuid === subUid)
        );
        
        if (user) {
          const templateType = freeze ? 'account_frozen' : 'account_unfrozen';
          const customData = freeze ? { freeze_reason: 'Административная блокировка' } : {};
          
          await sendUserTemplateEmail({
            user_id: user.id,
            template_type: templateType,
            custom_data: customData,
            freeze_reason: freeze ? 'Административная блокировка' : undefined
          });
          
          console.log(`Email уведомление о ${freeze ? 'заморозке' : 'разморозке'} отправлено пользователю ${user.id}`);
        }
      } catch (emailError) {
        console.error(`Ошибка отправки email при ${freeze ? 'заморозке' : 'разморозке'}:`, emailError);
      }
      
      fetchSubMembersData(); 
    } catch (err: unknown) {
      let errorMessage: string;
      if (isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message || `Ошибка при ${freeze ? 'заморозке' : 'разморозке'} саб-аккаунта.`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = `Произошла неизвестная ошибка при ${freeze ? 'заморозке' : 'разморозке'} саб-аккаунта.`;
      }
      console.error(`Error ${freeze ? 'freezing' : 'unfreezing'} subaccount:`, errorMessage, err);
      alert(errorMessage);
    } finally {
      setProcessingFreezeUnfreezeUid(null);
      setEmailLoading(null); // ✅ ИСПРАВЛЕНО
    }
  };

  const handleUnfreeze = async (subuid: string) => {
    try {
      setProcessingFreezeUnfreezeUid(subuid);
      setEmailLoading(`unfreeze-${subuid}`); // ✅ ИСПРАВЛЕНО

      await axios.post('/v1/clients/froze-subuid', {
        subuid,
        frozen: "0"
      });

      const apiKeyResponse = await axios.post("/v1/clients/bybit/subuser/api-key", {
        subuid,
        readOnly: 0,
        permissions: {
          ContractTrade: ["Order", "Position"],
          Spot: ["SpotTrade"],
          Wallet: ["AccountTransfer", "SubMemberTransferList"],
        },
      });

      if (!apiKeyResponse.data?.success) {
        throw new Error(apiKeyResponse.data?.error || 'Ошибка при создании API ключей');
      }

      try {
        const user = subMembers.find(member => 
          member.clients?.some(client => client.subuid === subuid)
        );

        if (user) {
          await sendUserTemplateEmail({
            user_id: user.id,
            template_type: 'account_unfrozen',
            custom_data: {}
          });
          
          console.log(`Email уведомление о разморозке отправлено пользователю ${user.id}`);
        }
      } catch (emailError) {
        console.error('Ошибка отправки email при разморозке:', emailError);
      }

      toast.success(`Аккаунт успешно разморожен и созданы новые API ключи:
        API Key: ${apiKeyResponse.data.result.apiKey}
        Secret: ${apiKeyResponse.data.result.secret}`);

      await fetchSubMembersData();

    } catch (error) {
      console.error('Error unfreezing account:', error);
      toast.error('Ошибка при разморозке аккаунта: ' + 
        (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setProcessingFreezeUnfreezeUid(null);
      setEmailLoading(null); // ✅ ИСПРАВЛЕНО
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground">Инициализация...</span>
        </div>
      </div>
    );
  }

  if (loadingSubMembers && loadingWithdrawals) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Управление клиентами и запросами</h1>
              <p className="text-muted-foreground mt-2">
                Управление субаккаунтами, верификацией и запросами на вывод средств
              </p>
            </div>
            <button
              onClick={() => {
                fetchSubMembersData();
                fetchAllWithdrawalRequests();
                fetchUsersWithRisks(); // ✅ ДОБАВЛЕНО
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>

        {/* ✅ ОБНОВЛЕННАЯ Stats секция с статистикой по рискам */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего клиентов</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активные</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Верифицированы</p>
                <p className="text-2xl font-bold text-foreground">{stats.verifiedUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ожидают верификации</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingVerification}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Individual</p>
                <p className="text-2xl font-bold text-foreground">{stats.individualUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Legal</p>
                <p className="text-2xl font-bold text-foreground">{stats.legalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ НОВАЯ секция статистики по рискам */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Риск не назначен</p>
                <p className="text-2xl font-bold text-foreground">{stats.riskStats.notAssigned}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Низкий риск</p>
                <p className="text-2xl font-bold text-foreground">{stats.riskStats.low}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Средний риск</p>
                <p className="text-2xl font-bold text-foreground">{stats.riskStats.medium}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Высокий риск</p>
                <p className="text-2xl font-bold text-foreground">{stats.riskStats.high}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Requests Section */}
        <div className="bg-card border border-border/50 rounded-xl mb-8">
          <div className="p-6 border-b border-border/30">
            <h2 className="text-xl font-semibold text-foreground">
              Запросы на вывод средств ({filteredWithdrawalRequests.length})
            </h2>
          </div>

          {/* Withdrawal Filters */}
          <div className="p-6 border-b border-border/30 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Начальная дата
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border border-border/30 rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Конечная дата
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 border border-border/30 rounded-lg bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Search className="w-4 h-4 inline mr-2" />
                  Поиск по запросам
                </label>
                <input
                  type="text"
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  placeholder="ID, сервис, валюта, статус..."
                  className="w-full p-3 border border-border/30 rounded-lg bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Withdrawal Table */}
          {loadingWithdrawals ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Загрузка запросов на вывод...</p>
            </div>
          ) : withdrawalError ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-500">{withdrawalError}</p>
            </div>
          ) : filteredWithdrawalRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Запросы не найдены</h3>
              <p className="text-sm text-muted-foreground">
                Нет запросов на вывод, соответствующих выбранным фильтрам
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="text-left p-4 font-medium text-foreground">Пользователь</th>
                    <th className="text-left p-4 font-medium text-foreground">SubUID</th>
                    <th className="text-left p-4 font-medium text-foreground">User ID</th>
                    <th className="text-left p-4 font-medium text-foreground">Withdrawal ID</th>
                    <th className="text-left p-4 font-medium text-foreground">Сервис</th>
                    <th className="text-right p-4 font-medium text-foreground">Сумма</th>
                    <th className="text-left p-4 font-medium text-foreground">Валюта</th>
                    <th className="text-center p-4 font-medium text-foreground">Статус</th>
                    <th className="text-left p-4 font-medium text-foreground">Время создания</th>
                    <th className="text-left p-4 font-medium text-foreground">Примечание</th>
                    <th className="text-center p-4 font-medium text-foreground">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredWithdrawalRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        {(() => {
                          const user = subMembers.find(member => member.id === request.user_id);
                          return user ? (
                            <div>
                              <p className="font-medium text-foreground">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{request.user_id}</span>
                          );
                        })()}
                      </td>
                      <td className="p-4 font-mono text-sm">
                        {(() => {
                          const user = subMembers.find(member => member.id === request.user_id);
                          return user && user.clients && user.clients.length > 0
                            ? user.clients.map(client => client.subuid).filter(Boolean).join(', ')
                            : <span className="text-muted-foreground">N/A</span>;
                        })()}
                      </td>
                      <td className="p-4 font-mono text-sm text-muted-foreground">{request.user_id}</td>
                      <td className="p-4 font-mono text-sm text-muted-foreground">{request.id}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {request.service}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-medium">
                        {displayWithdrawalAmount(request.amount)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {request.currency}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {editingRequestId === request.id ? (
                          <select
                            value={currentStatusSelection}
                            onChange={handleStatusChange}
                            className="p-2 border border-border/30 rounded-lg bg-background text-foreground text-sm"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {request.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 max-w-xs">
                        {editingRequestId === request.id ? (
                          <textarea
                            value={adminNotes}
                            onChange={handleAdminNotesChange}
                            className="w-full p-2 border border-border/30 rounded-lg bg-background text-foreground text-sm"
                            rows={2}
                            placeholder="Примечание для админа"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {request.admin_notes || '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingRequestId === request.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveStatus}
                              disabled={submittingStatus}
                              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              {submittingStatus ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                            >
                              <X className="w-3 h-3" />
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleViewWithdrawalDetails(request)}
                              className="flex items-center gap-1 px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                            >
                              <Info className="w-3 h-3" />
                              Детали
                            </button>
                            <button
                              onClick={() => handleEditClick(request)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Edit2 className="w-3 h-3" />
                              Редактировать
                            </button>
                            {request.status === 'APPROVED' && !request.service.toLowerCase().includes('bank') && (
                              <button
                                onClick={() => handleProcessCryptoWithdrawal(request.id)}
                                disabled={processingCryptoRequestId === request.id}
                                className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
                              >
                                <CreditCard className="w-3 h-3" />
                                {processingCryptoRequestId === request.id ? 'Обработка...' : 'Обработать крипто'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subaccounts Section */}
        <div className="bg-card border border-border/50 rounded-xl">
          <div className="p-6 border-b border-border/30">
            <h2 className="text-xl font-semibold text-foreground">
              Клиенты ({filteredSubMembers.length})
            </h2>
          </div>

          {/* ✅ ОБНОВЛЕННЫЕ Subaccounts Filters с фильтром по рискам */}
          <div className="p-6 border-b border-border/30 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Поиск */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Search className="w-4 h-4 inline mr-2" />
                  Поиск по клиентам
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={subaccountSearch}
                    onChange={(e) => setSubaccountSearch(e.target.value)}
                    placeholder="Поиск по имени, ID, email, username или Bybit SubUID..."
                    className="w-full pl-10 pr-4 py-3 border border-border/30 rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Переключатель типа пользователя */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Вид клиента
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setUserTypeFilter('ALL')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      userTypeFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    Все
                  </button>
                  <button
                    onClick={() => setUserTypeFilter('INDIVIDUAL')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      userTypeFilter === 'INDIVIDUAL'
                        ? 'bg-cyan-500 text-white border-cyan-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    Физ.лицо
                  </button>
                  <button
                    onClick={() => setUserTypeFilter('LEGAL')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      userTypeFilter === 'LEGAL'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Building className="w-3 h-3" />
                    Юр.лицо
                  </button>
                </div>
              </div>

              {/* ✅ НОВЫЙ Переключатель уровня риска */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <SortAsc className="w-4 h-4 inline mr-2" />
                  Уровень риска
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setRiskFilter('ALL')}
                    className={`flex items-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      riskFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Все
                  </button>
                  <button
                    onClick={() => setRiskFilter('NOT_ASSIGNED')}
                    className={`flex items-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      riskFilter === 'NOT_ASSIGNED'
                        ? 'bg-gray-500 text-white border-gray-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Не назначен
                  </button>
                  <button
                    onClick={() => setRiskFilter('LOW')}
                    className={`flex items-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      riskFilter === 'LOW'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Низкий
                  </button>
                  <button
                    onClick={() => setRiskFilter('MEDIUM')}
                    className={`flex items-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      riskFilter === 'MEDIUM'
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Средний
                  </button>
                  <button
                    onClick={() => setRiskFilter('HIGH')}
                    className={`flex items-center gap-1 px-2 py-2 rounded-lg border transition-colors text-xs font-medium ${
                      riskFilter === 'HIGH'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-background text-foreground border-border/30 hover:bg-muted/20'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    Высокий
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subaccounts Table */}
          {loadingSubMembers ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Загрузка клиентов...</p>
            </div>
          ) : errorSubMembers ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-500">{errorSubMembers}</p>
            </div>
          ) : filteredSubMembers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Клиенты не найдены</h3>
              <p className="text-sm text-muted-foreground">
                {riskFilter !== 'ALL' 
                  ? `Нет клиентов с уровнем риска "${riskFilter === 'NOT_ASSIGNED' ? 'Не назначен' : riskFilter}" соответствующих фильтрам`
                  : userTypeFilter !== 'ALL' 
                  ? `Нет клиентов типа ${userTypeFilter === 'INDIVIDUAL' ? 'Individual' : 'Legal'} соответствующих фильтрам`
                  : 'Попробуйте изменить параметры поиска'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="text-left p-4 font-medium text-foreground">Пользователь</th>
                    {/* <th className="text-left p-4 font-medium text-foreground">UID</th> */}
                    <th className="text-left p-4 font-medium text-foreground">Bybit UID</th>
                    <th className="text-center p-4 font-medium text-foreground">Вид Клиента</th>
                    <th className="text-center p-4 font-medium text-foreground">Локальный статус</th>
                    <th className="text-center p-4 font-medium text-foreground">Уровень классификации</th>
                    <th className="text-center p-4 font-medium text-foreground">Риск</th>
                    <th className="text-center p-4 font-medium text-foreground">ПДЛ Статус</th>
                    <th className="text-center p-4 font-medium text-foreground">Действия</th>
                    <th className="text-center p-4 font-medium text-foreground">Управление</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredSubMembers.map((member) => (
                    <React.Fragment key={member.id}>
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {member.first_name} {member.last_name}
                            </p>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {member.email && <p>📧 {member.email}</p>}
                              {member.username && <p>📱 {member.username}</p>}
                            </div>
                          </div>
                        </td>
                        {/* <td className="p-4 font-mono text-sm text-muted-foreground">{member.id}</td> */}
                        <td className="p-4 font-mono text-sm">
                          {member.clients && member.clients.length > 0
                            ? member.clients.map(client => client.subuid).filter(Boolean).join(', ')
                            : <span className="text-muted-foreground">N/A</span>}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.user_type === 'INDIVIDUAL'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {member.user_type === 'INDIVIDUAL' ? (
                              <>
                                <User className="w-3 h-3" />
                                Individual
                              </>
                            ) : (
                              <>
                                <Building className="w-3 h-3" />
                                Legal
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {member.clients && member.clients.length > 0 ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.clients[0].status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {member.clients[0].status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.verification_level_id === 3
                                ? 'bg-green-100 text-green-800'
                                : member.verification_level_id === 2
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {member.verification_level_id === 3
                              ? 'Professional'
                              : member.verification_level_id === 2
                              ? 'Qualified'
                              : 'Retail'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {editingRiskForUserId === member.id || assigningRiskForUserId === member.id ? (
                            <div className="space-y-2">
                              <select
                                value={riskEditData.risk_level}
                                onChange={(e) => setRiskEditData(prev => ({ ...prev, risk_level: e.target.value }))}
                                className="w-full p-2 border border-border/30 rounded-lg bg-background text-foreground text-sm"
                              >
                                <option value="select">Выберите уровень риска</option>
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                              </select>
                              <input
                                type="text"
                                value={riskEditData.reason}
                                onChange={(e) => setRiskEditData(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Причина (опционально)"
                                className="w-full p-2 border border-border/30 rounded-lg bg-background text-foreground text-sm"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    if (assigningRiskForUserId === member.id) {
                                      handleSaveAssignedRisk(member.id);
                                    } else {
                                      handleSaveRisk(member.id);
                                    }
                                  }}
                                  disabled={riskEditData.risk_level === 'select'}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelRiskEdit}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white rounded text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {(() => {
                                // ✅ ОБНОВЛЕННАЯ ЛОГИКА: Проверяем наличие риска в таблице рисков
                                const userRiskFromTable = getUserRiskFromTable(member.id);
                                
                                if (userRiskFromTable) {
                                  // Если риск назначен - показываем его данные
                                  return (
                                    <>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          getRiskLevelColorClass(userRiskFromTable.risk_level)
                                        }`}
                                      >
                                        <Shield className="w-3 h-3" />
                                        {getRiskLevelDisplayName(userRiskFromTable.risk_level)}
                                      </span>
                                      {userRiskFromTable.reason && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Причина: {userRiskFromTable.reason}
                                        </p>
                                      )}
                                      {userRiskFromTable.risk_assigned_at && (
                                        <p className="text-xs text-muted-foreground">
                                          Назначен: {new Date(userRiskFromTable.risk_assigned_at).toLocaleDateString()}
                                        </p>
                                      )}
                                      <button
                                        onClick={() => handleEditRisk(member)}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Изменить
                                      </button>
                                    </>
                                  );
                                } else {
                                  // Если риск не назначен - показываем кнопку назначения
                                  return (
                                    <>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        <Shield className="w-3 h-3" />
                                        Риск не назначен
                                      </span>
                                      <button
                                        onClick={() => handleAssignRisk(member)}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs mt-1"
                                      >
                                        <UserPlus className="w-3 h-3" />
                                        Назначить риск
                                      </button>
                                    </>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {(() => {
                            if (loadingSurveyData) {
                              return <span className="text-muted-foreground text-sm">Загрузка...</span>;
                            }
                            
                            const pdlData = getPDLAnswerForUser(member.id);
                            
                            return (
                              <div className="space-y-1">
                                <p className="text-sm text-foreground font-medium">
                                  {pdlData.answer || 'Не указано'}
                                </p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  pdlData.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  pdlData.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                  pdlData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  pdlData.status === 'no_question' ? 'bg-gray-100 text-gray-800' :
                                  pdlData.status === 'no_answers' ? 'bg-blue-100 text-blue-800' :
                                  pdlData.status === 'no_answer' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {pdlData.status === 'APPROVED' ? 'Одобрено' :
                                  pdlData.status === 'REJECTED' ? 'Отклонено' :
                                  pdlData.status === 'pending' ? 'Ожидает' :
                                  pdlData.status === 'no_question' ? 'Вопрос не найден' :
                                  pdlData.status === 'no_answers' ? 'Нет ответов' :
                                  pdlData.status === 'no_answer' ? 'Не отвечено' :
                                  'Нет данных'}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleViewDocuments(member)}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                            >
                              <Eye className="w-3 h-3" />
                              {showingDocsForUid === member.id ? 'Скрыть документы классификации' : 'Документы классификации'}
                            </button>
                            <button
                              onClick={() => handleViewAdminDocuments(member)}
                              className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                            >
                              <FileText className="w-3 h-3" />
                              {showingAdminDocsForUid === member.id ? 'Скрыть админ док.' : 'Админ документы'}
                            </button>
                            <button
                              onClick={() => handleAboutUserClick(member)}
                              className="flex items-center gap-1 px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                            >
                              <Users className="w-3 h-3" />
                              {showingUserInfoForUid === member.id ? 'Скрыть инфо' : 'О клиенте'}
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            {(() => {
                              const bybitClient = member.clients?.find(client => client.subuid);
                              if (bybitClient && bybitClient.subuid) {
                                return (
                                  <>
                                    <button
                                      onClick={() => handleFreezeUnfreezeSubaccount(bybitClient.subuid, true)}
                                      className={`flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50
                                        ${processingFreezeUnfreezeUid === bybitClient.subuid || emailLoading === `freeze-${bybitClient.subuid}` ? 'cursor-not-allowed' : ''}`}
                                      disabled={processingFreezeUnfreezeUid === bybitClient.subuid || emailLoading === `freeze-${bybitClient.subuid}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                      {emailLoading === `freeze-${bybitClient.subuid}` ? 
                                        'Email...' :
                                        processingFreezeUnfreezeUid === bybitClient.subuid ? 
                                        'Заморозка...' : 
                                        'Заморозить'
                                      }
                                    </button>
                                    <button
                                      onClick={() => handleUnfreeze(bybitClient.subuid)}
                                      className={`flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50
                                        ${processingFreezeUnfreezeUid === bybitClient.subuid || emailLoading === `unfreeze-${bybitClient.subuid}` ? 'cursor-not-allowed' : ''}`}
                                      disabled={processingFreezeUnfreezeUid === bybitClient.subuid || emailLoading === `unfreeze-${bybitClient.subuid}`}
                                    >
                                      <Play className="w-3 h-3" />
                                      {emailLoading === `unfreeze-${bybitClient.subuid}` ? 
                                        'Email...' :
                                        processingFreezeUnfreezeUid === bybitClient.subuid ? 
                                        'Разморозка...' : 
                                        'Разморозить'
                                      }
                                    </button>
                                  </>
                                );
                              } else {
                                return <span className="text-muted-foreground text-sm">N/A</span>;
                              }
                            })()}
                          </div>
                        </td>
                      </tr>

                      {/* Documents Section */}
                      {showingDocsForUid === member.id && (
                        <tr>
                          <td colSpan={9} className="p-6 bg-muted/10">
                            <div className="rounded-lg border border-border/30 p-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold mb-2 sm:mb-0 text-foreground">
                                  Документы для {member.username} (UID: {member.id})
                                </h4>
                                
                                {(() => {
                                  const pendingDoc = member.documents?.find((doc: Document) => doc.status === 'pending' || doc.status === 'rejected');
                                  return pendingDoc && (
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                      <button
                                        onClick={() => handleApproveVerification(member.id)}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                                        disabled={verifyingUserDocId === member.id || emailLoading === `approve-${member.id}`}
                                      >
                                        <Check className="w-3 h-3" />
                                        {emailLoading === `approve-${member.id}` ? 
                                          'Отправка email...' : 
                                          verifyingUserDocId === member.id ? 
                                          'Обработка...' : 
                                          'Утвердить верификацию'
                                        }
                                      </button>
                                      <button
                                        onClick={() => handleOpenRejectModal(member.id)}
                                        className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                                        disabled={verifyingUserDocId === member.id || emailLoading === `reject-${member.id}`}
                                      >
                                        <X className="w-3 h-3" />
                                        {emailLoading === `reject-${member.id}` ? 
                                          'Отправка email...' : 
                                          'Отклонить верификацию'
                                        }
                                      </button>
                                    </div>
                                   );
                                  })()}
                              </div>

                              {member.documents && member.documents.length > 0 ? (
                                <div className="space-y-3">
                                  {member.documents.map((doc: Document) => (
                                    <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border/30 rounded-lg bg-background">
                                      <div className="mb-2 sm:mb-0 flex-1">
                                        <p className="font-medium text-foreground">Name: {doc.document_type}</p> 
                                        <p className="text-sm text-muted-foreground">
                                          Статус:{" "}
                                          <span className={`font-medium inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                            doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            doc.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                          }`}>
                                            {doc.status}
                                          </span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Загружен: {new Date(doc.uploaded_at).toLocaleString()}
                                        </p>
                                      </div>
                                      
                                      <div className="flex w-full sm:w-auto">
                                        <button
                                          onClick={() => handleDownloadDocument(doc)}
                                          className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 w-full sm:w-auto"
                                          disabled={downloadingDocId === doc.id}
                                        >
                                          <Download className="w-3 h-3" />
                                          {downloadingDocId === doc.id ? 'Загрузка...' : 'Скачать'}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Eye className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                  <p className="text-muted-foreground">Нет загруженных документов.</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Admin Documents Section */}
                      {showingAdminDocsForUid === member.id && (
                        <tr>
                          <td colSpan={9} className="p-6 bg-purple-50/50">
                            <div className="rounded-lg border border-purple-200 p-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold mb-2 sm:mb-0 text-purple-800">
                                  Документы от администратора для {member.username} (UID: {member.id})
                                </h4>
                                
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="file"
                                      id={`admin-upload-${member.id}`}
                                      className="hidden"
                                      accept={getSupportedFileFormats()} // ✅ ОБНОВЛЕНО: Теперь включает Excel форматы
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          // ✅ НОВАЯ ЛОГИКА: Определяем тип документа на основе файла
                                          let defaultDocumentType = 'admin_doc';
                                          if (isExcelFile(file)) {
                                            defaultDocumentType = 'spreadsheet';
                                          } else if (file.type.startsWith('image/')) {
                                            defaultDocumentType = 'image';
                                          } else if (file.type === 'application/pdf') {
                                            defaultDocumentType = 'pdf_document';
                                          }
                                          
                                          const documentType = prompt(
                                            `Тип документа (поддерживаемые форматы: ${getSupportedFileDescription()}):`, 
                                            defaultDocumentType
                                          ) || defaultDocumentType;
                                          
                                          const notes = prompt('Примечания (опционально):') || '';
                                          await handleUploadDocumentForUser(member.id, file, documentType, notes);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                    <button
                                      onClick={() => document.getElementById(`admin-upload-${member.id}`)?.click()}
                                      disabled={uploadingDocForUserId === member.id}
                                      className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                                    >
                                      <Upload className="w-3 h-3" />
                                      {uploadingDocForUserId === member.id ? 'Загрузка...' : 'Загрузить'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {loadingAdminDocs === member.id ? (
                                <div className="text-center py-4">
                                  <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-2" />
                                  <p className="text-purple-600">Загрузка админских документов...</p>
                                </div>
                              ) : adminDocuments[member.id] && adminDocuments[member.id].length > 0 ? (
                                <div className="space-y-3">
                                  {adminDocuments[member.id].map((doc) => (
                                    <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-purple-200 rounded-lg bg-white">
                                      <div className="mb-2 sm:mb-0 flex-1">
                                        <p className="font-medium text-purple-800">Name: {doc.document_type}</p>
                                        {/* <p className="text-sm text-purple-600">
                                          Статус:{" "}
                                          <span className={`font-medium inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                            doc.status === 'reviewed' ? 'bg-green-100 text-green-800' :
                                            doc.status === 'uploaded' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {doc.status}
                                          </span>
                                        </p> */}
                                        <p className="text-xs text-purple-500">
                                          Загружен: {new Date(doc.uploaded_at).toLocaleString()}
                                        </p>
                                        {doc.notes && (
                                          <p className="text-xs text-purple-600 mt-1">
                                            Примечание: {doc.notes}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div className="flex gap-2 w-full sm:w-auto">
                                        <button
                                          onClick={() => handleDownloadAdminDocument(doc)}
                                          disabled={downloadingAdminDocId === doc.id}
                                          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                                        >
                                          <Download className="w-3 h-3" />
                                          {downloadingAdminDocId === doc.id ? 'Загрузка...' : 'Скачать'}
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm('Удалить этот документ?')) {
                                              try {
                                                await deleteAdminDocument(doc.id);
                                                setAdminDocuments(prev => ({
                                                  ...prev,
                                                  [member.id]: prev[member.id].filter(d => d.id !== doc.id)
                                                }));
                                                toast.success('Документ удален');
                                              } catch (error) {
                                                console.error('Error deleting document:', error);
                                                toast.error('Ошибка удаления документа');
                                              }
                                            }
                                          }}
                                          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Удалить
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-purple-500" />
                                  </div>
                                  <p className="text-purple-600">Нет админских документов.</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* User Info Section */}
                      {showingUserInfoForUid === member.id && (
                        <tr>
                          <td colSpan={9} className="p-6 bg-muted/10">
                            <div className="rounded-lg border border-border/30 p-4">
                              <h4 className="text-lg font-semibold mb-4 text-foreground">
                                Информация о пользователе ({member.first_name} {member.last_name})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">ID:</span>
                                    <span className="text-muted-foreground font-mono">{member.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Username:</span>
                                    <span className="text-muted-foreground">{member.username}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Email:</span>
                                    <span className="text-muted-foreground">{member.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Телефон:</span>
                                    <span className="text-muted-foreground">+{member.username || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Тип пользователя:</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      member.user_type === 'INDIVIDUAL'
                                        ? 'bg-cyan-100 text-cyan-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {member.user_type === 'INDIVIDUAL' ? (
                                        <>
                                          <User className="w-3 h-3" />
                                          Individual
                                        </>
                                      ) : (
                                        <>
                                          <Building className="w-3 h-3" />
                                          Legal
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Тип провайдера:</span>
                                    <span className="text-muted-foreground">{member.provider_type}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Статус:</span>
                                    <span className="text-muted-foreground">{member.clients?.[0]?.status}</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Уровень классификации:</span>
                                    <span className="text-muted-foreground">
                                      {member.verification_level?.name === 'Semi-professional' ? 'Qualified' : (member.verification_level?.name || 'N/A')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Лимит:</span>
                                    <span className="text-muted-foreground">{member.verification_level?.limit_amount || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Роль:</span>
                                    <span className="text-muted-foreground">{member.role?.name || 'N/A'} ({member.role?.code || 'N/A'})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Тестовый балл:</span>
                                    <span className="text-muted-foreground">{member.test_score}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Создан:</span>
                                    <span className="text-muted-foreground">{new Date(member.created_at).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Обновлен:</span>
                                    <span className="text-muted-foreground">{new Date(member.updated_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Verification Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Отклонить верификацию
            </h3>
            <p className="text-muted-foreground mb-4">
              Вы собираетесь отклонить верификацию для пользователя (ID: {userToRejectId}). 
              Пожалуйста, укажите причину:
            </p>
            <textarea
              className="w-full p-3 border border-border/30 rounded-lg bg-background text-foreground mb-4"
              rows={4}
              placeholder="Причина отклонения (обязательно)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCloseRejectModal}
                className="flex-1 px-4 py-2 border border-border/30 rounded-lg text-foreground hover:bg-muted/20 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleModalReject}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={!rejectReason.trim() || emailLoading === `reject-${userToRejectId}`}
              >
                {emailLoading === `reject-${userToRejectId}` ? 'Отправка email...' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Details Modal */}
      {showWithdrawalDetailsModal && selectedWithdrawalRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border/50 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                Детали запроса на вывод #{selectedWithdrawalRequest.id.slice(0, 8)}...
              </h2>
              <button
                onClick={handleCloseWithdrawalDetailsModal}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Основная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-blue-700">ID запроса:</span>
                      <p className="text-blue-900 font-mono">{selectedWithdrawalRequest.id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">ID пользователя:</span>
                      <p className="text-blue-900 font-mono">{selectedWithdrawalRequest.user_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Сумма:</span>
                      <p className="text-blue-900 font-bold">{displayWithdrawalAmount(selectedWithdrawalRequest.amount)} {selectedWithdrawalRequest.currency}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Сервис:</span>
                      <p className="text-blue-900">{selectedWithdrawalRequest.service}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-blue-700">Статус:</span>
                      <p className="text-blue-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedWithdrawalRequest.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : selectedWithdrawalRequest.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedWithdrawalRequest.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Создано:</span>
                      <p className="text-blue-900">{new Date(selectedWithdrawalRequest.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Обновлено:</span>
                      <p className="text-blue-900">{new Date(selectedWithdrawalRequest.updated_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Валюта:</span>
                      <p className="text-blue-900">{selectedWithdrawalRequest.currency}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {selectedWithdrawalRequest.service === 'ETH' || selectedWithdrawalRequest.service === 'BTC' ? 'Крипто адрес' : 'Банковские реквизиты'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {selectedWithdrawalRequest.service === 'ETH' || selectedWithdrawalRequest.service === 'BTC' ? (
                      <>
                        <div>
                          <span className="font-medium text-green-700">Адрес кошелька:</span>
                          <p className="text-green-900 font-mono break-all">{selectedWithdrawalRequest.iin_bin || selectedWithdrawalRequest.address || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Имя получателя:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.recipient_name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Название перевода:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.transfer_name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Страна:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.country}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="font-medium text-green-700">ИИН/БИН:</span>
                          <p className="text-green-900 font-mono">{selectedWithdrawalRequest.iin_bin}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Номер счета:</span>
                          <p className="text-green-900 font-mono">{selectedWithdrawalRequest.account_number}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Имя получателя:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.recipient_name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Страна:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.country}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedWithdrawalRequest.service !== 'ETH' && selectedWithdrawalRequest.service !== 'BTC' && (
                      <>
                        <div>
                          <span className="font-medium text-green-700">КНП:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.knp || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">КБе:</span>
                          <p className="text-green-900">{selectedWithdrawalRequest.kbe || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="font-medium text-green-700">Название перевода:</span>
                      <p className="text-green-900">{selectedWithdrawalRequest.transfer_name}</p>
                    </div>
                    {selectedWithdrawalRequest.tx_hash && (
                      <div>
                        <span className="font-medium text-green-700">Хэш транзакции:</span>
                        <p className="text-green-900 font-mono break-all">{selectedWithdrawalRequest.tx_hash}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Административная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-purple-700">Обработано кем:</span>
                      <p className="text-purple-900">{selectedWithdrawalRequest.processed_by || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Время обработки:</span>
                      <p className="text-purple-900">
                        {selectedWithdrawalRequest.processed_at 
                          ? new Date(selectedWithdrawalRequest.processed_at).toLocaleString() 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-purple-700">Bybit Order ID:</span>
                      <p className="text-purple-900 font-mono">{selectedWithdrawalRequest.bybit_order_id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-purple-700">Примечания администратора:</span>
                      <p className="text-purple-900">{selectedWithdrawalRequest.admin_notes || 'Нет примечаний'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {(() => {
                const user = subMembers.find(member => member.id === selectedWithdrawalRequest.user_id);
                return user && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Информация о пользователе
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-orange-700">Имя:</span>
                          <p className="text-orange-900">{user.first_name} {user.last_name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Email:</span>
                          <p className="text-orange-900">{user.email}</p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Username:</span>
                          <p className="text-orange-900">{user.username}</p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Тип пользователя:</span>
                          <p className="text-orange-900">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              user.user_type === 'INDIVIDUAL'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {user.user_type === 'INDIVIDUAL' ? (
                                <>
                                  <User className="w-3 h-3" />
                                  Individual
                                </>
                              ) : (
                                <>
                                  <Building className="w-3 h-3" />
                                  Legal
                                </>
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-orange-700">Bybit SubUID:</span>
                          <p className="text-orange-900 font-mono">
                            {user.clients && user.clients.length > 0
                              ? user.clients.map(client => client.subuid).filter(Boolean).join(', ')
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Статус верификации:</span>
                          <p className="text-orange-900">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.verification_level_id === 3
                                ? 'bg-green-100 text-green-800'
                                : user.verification_level_id === 2
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.verification_level_id === 3
                                ? 'Верифицирован'
                                : user.verification_level_id === 2
                                ? 'Ожидает верификации'
                                : 'Не верифицирован'}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Статус:</span>
                          <p className="text-orange-900">
                            {user.clients && user.clients.length > 0 ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.clients[0].status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.clients[0].status}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-orange-700">Уровень риска:</span>
                          <p className="text-orange-900">
                            {(() => {
                              const userRiskFromTable = getUserRiskFromTable(user.id);
                              if (userRiskFromTable) {
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    getRiskLevelColorClass(userRiskFromTable.risk_level)
                                  }`}>
                                    <Shield className="w-3 h-3" />
                                    {getRiskLevelDisplayName(userRiskFromTable.risk_level)}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <Shield className="w-3 h-3" />
                                    Риск не назначен
                                  </span>
                                );
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseWithdrawalDetailsModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubaccountPage;
              