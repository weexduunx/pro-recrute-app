import React, { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'candidat' | 'interimaire';

interface TabContextType {
  selectedTab: TabType;
  setSelectedTab: (tab: TabType) => void;
}

const TabSwitcherContext = createContext<TabContextType | undefined>(undefined);

export const TabSwitcherProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTab, setSelectedTab] = useState<TabType>('interimaire');
  return (
    <TabSwitcherContext.Provider value={{ selectedTab, setSelectedTab }}>
      {children}
    </TabSwitcherContext.Provider>
  );
};

export const useTabSwitcher = () => {
  const context = useContext(TabSwitcherContext);
  if (!context) throw new Error("useTabSwitcher must be used within TabSwitcherProvider");
  return context;
};
