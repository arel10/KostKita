import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Subscription, SubscriptionUsage } from '../types';
import { QuotaExceededModal } from '../components/subscription/QuotaExceededModal';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: SubscriptionUsage | null;
  isLoading: boolean;
  isPropertyBlocked: boolean;
  isRoomBlocked: boolean;
  isTenantBlocked: boolean;
  refreshSubscription: () => Promise<void>;
  openQuotaModal: (type: 'property' | 'room' | 'tenant') => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal prompt state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'property' | 'room' | 'tenant';
  }>({
    isOpen: false,
    type: 'property',
  });

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/subscriptions/current');
      if (res.data?.data) {
        const data = res.data.data;
        setSubscription(data);
        if (data.usage) {
          setUsage(data.usage);
        }
      } else {
        setSubscription(null);
        setUsage(null);
      }
    } catch (e) {
      console.error('Failed to load subscription info:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const openQuotaModal = (type: 'property' | 'room' | 'tenant') => {
    setModalState({ isOpen: true, type });
  };

  const closeQuotaModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Block states
  // If usage is present, use usage.allowed. If null or no active subscription, treat as blocked.
  const isPropertyBlocked = usage ? !usage.properties.allowed : false;
  const isRoomBlocked = usage ? !usage.rooms.allowed : false;
  const isTenantBlocked = usage ? !usage.tenants.allowed : false;

  const currentCount = usage ? usage[modalState.type === 'property' ? 'properties' : modalState.type === 'room' ? 'rooms' : 'tenants']?.current || 0 : 0;
  const limitCount = usage ? usage[modalState.type === 'property' ? 'properties' : modalState.type === 'room' ? 'rooms' : 'tenants']?.limit : null;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        usage,
        isLoading,
        isPropertyBlocked,
        isRoomBlocked,
        isTenantBlocked,
        refreshSubscription,
        openQuotaModal,
      }}
    >
      {children}

      <QuotaExceededModal
        isOpen={modalState.isOpen}
        onClose={closeQuotaModal}
        type={modalState.type}
        current={currentCount}
        limit={limitCount}
        planName={subscription?.plan?.name || 'Trial'}
      />
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
