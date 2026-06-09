import { useAuthStore } from '../stores/authStore';

/**
 * Modos del vendedor móvil — configurados por el admin del cliente
 * desde Conta FT → Configuración → Vendedores Móviles.
 *
 * Devuelve banderas estables que las pantallas usan para ocultar
 * tabs y botones que la empresa no autoriza. Defaults conservadores
 * (solo pedidos) si la empresa no devolvió los campos por alguna razón.
 */
export interface CompanyModes {
  pedidos: boolean;
  facturaPos: boolean;
  facturaElectronica: boolean;
  // Helpers derivados — facilitan el render condicional
  algunaFactura: boolean;
  todoDisponible: boolean;
}

export const useCompanyModes = (): CompanyModes => {
  const company = useAuthStore((s) => s.company);
  const pedidos = company?.modo_pedidos ?? true;
  const facturaPos = company?.modo_factura_pos ?? false;
  const facturaElectronica = company?.modo_factura_electronica ?? false;
  return {
    pedidos,
    facturaPos,
    facturaElectronica,
    algunaFactura: facturaPos || facturaElectronica,
    todoDisponible: pedidos && (facturaPos || facturaElectronica),
  };
};
