import { createContext, ReactNode, useContext, useState } from "react";

const TabBarHiddenContext = createContext<boolean>(false);
const SetTabBarHiddenContext = createContext<(isHidden: boolean) => void>(
  () => {},
);

type TabBarProviderProps = {
  children: ReactNode;
};

export function TabBarProvider({ children }: Readonly<TabBarProviderProps>) {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  return (
    <TabBarHiddenContext value={isTabBarHidden}>
      <SetTabBarHiddenContext value={setIsTabBarHidden}>
        {children}
      </SetTabBarHiddenContext>
    </TabBarHiddenContext>
  );
}

export function useIsTabBarHidden() {
  return useContext(TabBarHiddenContext);
}

export function useSetIsTabBarHidden() {
  return useContext(SetTabBarHiddenContext);
}
