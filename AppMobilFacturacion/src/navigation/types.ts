import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabsParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Invoices: undefined;
  More: undefined;
};

export type RootStackParamList = {
  VincularEmpresa: undefined;
  Login: undefined;
  Main: NavigatorScreenParams<MainTabsParamList>;
  CreateOrder: undefined;
  CreateInvoice: undefined;
  CreateClient: undefined;
  ClientDetail: { clientId: number };
  EditClient: { clientId: number };
  InvoiceDetail: { invoiceId: string };
  Products: undefined;
  Clients: undefined;
  ClientPicker: { onSelect?: string };
  Sync: undefined;
  MiCargue: undefined;
};
