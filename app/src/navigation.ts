export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: undefined;
  Processing: { receiptId: string };
  Review: { receiptId: string };
  SupplierDetail: { supplierId: string };
  Report: undefined;
  SplitSummary: { token: string; shareUrl: string };
};

export type TabsParamList = {
  Inicio: undefined;
  Despesas: undefined;
  Entidades: undefined;
};
