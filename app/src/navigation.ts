export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Tabs: undefined;
  Processing: { receiptId: string };
  Review: { receiptId: string };
  SupplierDetail: { supplierId: string };
  Report: undefined;
  SplitSummary: { token: string; shareUrl: string };
  Upgrade: undefined;
  Recurring: undefined;
  Budgets: undefined;
  QrScan: undefined;
};

export type TabsParamList = {
  Inicio: undefined;
  Despesas: undefined;
  Entidades: undefined;
  Perfil: undefined;
};
