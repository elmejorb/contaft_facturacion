"""
4_migrar.py — Migra el JSONL del Access a la BD MySQL destino.

Orden: catálogos → artículos → ventas → detalle_venta → pagos → pedidos
       → detalle_pedido → controlcaja → egresos → auxiliar_banco → kardex.

Reglas:
- Clientes se insertan por CodigoClien (nunca por documento).
- Facturas anuladas se guardan con EstadoFact='Anulada'.
- Kardex se filtra desde --corte-kardex. Ventas y pagos siempre se migran enteros.
- Fechas del VB6 vienen en formato US (MM/DD/YY HH:MM:SS) — se convierten a ISO.

Uso:
    python 4_migrar.py --jsonl ./scratchpad/mycliente_jsonl \
                       --db conta_mycliente \
                       --corte-kardex 2024-11-02
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

try:
    import pymysql
except ImportError:
    sys.exit("Instalar pymysql: pip install pymysql")


FORMATOS = [
    '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d',
    '%m/%d/%y %H:%M:%S', '%m/%d/%Y %H:%M:%S', '%m/%d/%y', '%m/%d/%Y',
    '%d/%m/%Y %H:%M:%S', '%d/%m/%Y',
]
BATCH = 2000


def dtp(s):
    if not s or not isinstance(s, str):
        return None
    s = s.strip().replace('T', ' ').split('.')[0]
    for f in FORMATOS:
        try:
            return dt.datetime.strptime(s, f)
        except Exception:
            pass
    return None


def num(v, d=0.0):
    try:
        return float(v) if v not in (None, '') else d
    except Exception:
        return d


def iint(v, d=0):
    try:
        return int(float(v)) if v not in (None, '') else d
    except Exception:
        return d


def ss(v, L=None, d=''):
    if v is None:
        return d
    x = str(v)
    return x[:L] if L else x


def rows(indir, tabla):
    f = Path(indir) / f'{tabla}.jsonl'
    if not f.exists():
        return
    with f.open('r', encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def flush(cur, sql, buf):
    if buf:
        cur.executemany(sql, buf)
        buf.clear()


# ----------------------------------------------------------------------
def migrar_catalogos(cn, cur, indir):
    print('=== CATALOGOS ===')
    cur.execute('DELETE FROM tblcategoria')
    cur.execute('DELETE FROM tblreferencia')
    for r in rows(indir, 'tblCategoria'):
        cur.execute(
            'INSERT INTO tblcategoria (Id_Categoria, Categoria) VALUES (%s,%s)',
            (iint(r.get('Id_Categoria')), ss(r.get('Categoria'), 100)),
        )
    for r in rows(indir, 'tblReferencia'):
        cur.execute(
            'INSERT INTO tblreferencia (Id_Referencia, Referencia) VALUES (%s,%s)',
            (iint(r.get('Id_Referencia')), ss(r.get('Referencia'), 100)),
        )
    cn.commit()


def migrar_proveedores(cn, cur, indir):
    print('=== PROVEEDORES ===')
    sql = """INSERT IGNORE INTO tblproveedores
        (CodigoPro, RazonSocial, Nit, Direccion, Telefonos, Nombres, Apellidos,
         Identificacion, Telefonos_C, Direccion_C, Empresa, CuentaN, Fecha_Iingreso)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    for r in rows(indir, 'tblProveedores'):
        cur.execute(sql, (
            iint(r.get('CodigoPro')),
            ss(r.get('RazonSocial'), 50),
            ss(r.get('Nit'), 15),
            ss(r.get('Direccion'), 50),
            ss(r.get('Telefonos'), 30),
            ss(r.get('Nombres'), 50),
            ss(r.get('Apellidos'), 20),
            iint(r.get('Identificacion')),
            ss(r.get('Telefonos_C'), 30),
            ss(r.get('Direccion_C'), 50),
            ss(r.get('Empresa'), 30),
            ss(r.get('CuentaN'), 50),
            dtp(r.get('Fecha_Iingreso') or r.get('Fecha_Ingreso')),
        ))
    cn.commit()


def migrar_clientes(cn, cur, indir):
    print('=== CLIENTES ===')
    cur.execute("DELETE FROM tblclientes WHERE CodigoClien NOT IN (130500, 130502)")
    sql = """INSERT IGNORE INTO tblclientes
        (CodigoClien, Razon_Social, Nit, Direcion_R, Nombres, Apellidos,
         Identificacion, Telefonos, Direccion, Nombre_C, Apellidos_C, Telefonos_C,
         Direccion_C, Cargo_C, Fecha_Ingreso, CupoAutorizado, Preciocosto, CodigoEmp,
         FechaCumple, Email, Termino, FacVenc)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    for r in rows(indir, 'tblClientes'):
        cod = iint(r.get('CodigoClien'))
        if cod in (130500, 130502):
            continue
        cur.execute(sql, (
            cod,
            ss(r.get('Razon_Social'), 80),
            ss(r.get('Nit'), 15),
            ss(r.get('Direcion_R'), 50),
            ss(r.get('Nombres'), 20),
            ss(r.get('Apellidos'), 20),
            iint(r.get('Identificacion')),
            ss(r.get('Telefonos'), 100),
            ss(r.get('Direccion'), 50),
            ss(r.get('Nombre_C'), 50),
            ss(r.get('Apellidos_C'), 50),
            ss(r.get('Telefonos_C'), 50),
            ss(r.get('Direccion_C'), 50),
            ss(r.get('Cargo_C'), 50),
            dtp(r.get('Fecha_Ingreso')),
            num(r.get('CupoAutorizado')),
            1 if r.get('Preciocosto') in (True, 1, '1') else 0,
            iint(r.get('CodigoEmp')),
            dtp(r.get('FechaCumple')),
            ss(r.get('Email'), 50),
            iint(r.get('Termino')),
            iint(r.get('FacVenc')),
        ))
    cn.commit()


def migrar_articulos(cn, cur, indir):
    print('=== ARTICULOS ===')
    cur.execute('DELETE FROM tblarticulos')
    sql = """INSERT INTO tblarticulos
        (Items, Codigo, CodigoB, Nombres_Articulo, Id_Categoria, Id_Referencia,
         Existencia, Existencia_minima, Precio_Costo, Precio_CostoComp, Iva,
         Precio_Venta, Precio_Venta2, Precio_Venta3, Fecha_Vencimiento, CodigoPro,
         Estante, Flete, ArticuloDe, Ganancia, Sindescuento, Precio_Minimo,
         PlanSepare, Servicio, Unidades, CuponDesc, Estado, FechaElim, FechaMod)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblArticulos'):
        buf.append((
            iint(r.get('Items')), ss(r.get('Codigo'), 25), ss(r.get('CodigoB'), 15),
            ss(r.get('Nombres_Articulo'), 150), iint(r.get('Id_Categoria')),
            iint(r.get('Id_Referencia')),
            num(r.get('Existencia')), num(r.get('Existencia_minima')),
            num(r.get('Precio_Costo')), num(r.get('Precio_CostoComp')),
            num(r.get('Iva')), num(r.get('Precio_Venta')),
            num(r.get('Precio_Venta2')), num(r.get('Precio_Venta3')),
            dtp(r.get('Fecha_Vencimiento')), iint(r.get('CodigoPro')),
            ss(r.get('Estante'), 10), num(r.get('Flete')),
            ss(r.get('ArticuloDe'), 10), iint(r.get('Ganancia')),
            1 if r.get('Sindescuento') in (True, 1, '1') else 0,
            num(r.get('Precio_Minimo')),
            iint(r.get('PlanSepare')), iint(r.get('Servicio')),
            iint(r.get('Unidades')), iint(r.get('CuponDesc')),
            iint(r.get('Estado'), 1),
            dtp(r.get('FechaElim')), dtp(r.get('FechaMod')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
    flush(cur, sql, buf)
    cn.commit()
    print(f'  insertados: {n}')


def migrar_ventas(cn, cur, indir):
    print('=== VENTAS ===')
    cur.execute('DELETE FROM tblventas')
    sql = """INSERT INTO tblventas
        (Factura_N, N_Mes, anio, Fecha, Tipo, Dias, CodigoCli, A_nombre,
         Identificacion, Direccion, Telefono, Impuesto, Descuento, Flete,
         Total, Saldo, EstadoPedido, Comentario, EstadoFact, Pago, Cambio,
         Hora, Id_Usuario, Abono, pagada, CodigoEmp, Modifi, FechaMod)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblVentas'):
        saldo = num(r.get('Saldo'))
        estado_fact = ss(r.get('EstadoFact'), 10,
                         'Pagada' if saldo <= 0 else 'Credito')
        pagada = 'S' if saldo <= 0.01 and estado_fact.lower() != 'anulada' else 'N'
        anio = iint(r.get('Año') or r.get('Anio') or r.get('Año'))
        if not anio:
            f = dtp(r.get('Fecha'))
            anio = f.year if f else 0
        buf.append((
            iint(r.get('Factura_N')), iint(r.get('N_Mes')), anio,
            dtp(r.get('Fecha')), ss(r.get('Tipo'), 8),
            iint(r.get('Dias')), iint(r.get('CodigoCli')),
            ss(r.get('A_nombre'), 70), ss(r.get('Identificacion'), 20),
            ss(r.get('Direccion'), 50), ss(r.get('Telefono'), 50),
            num(r.get('Impuesto')), num(r.get('Descuento')), num(r.get('Flete')),
            num(r.get('Total')), saldo,
            ss(r.get('EstadoPedido'), 15), ss(r.get('Comentario')),
            estado_fact,
            ss(r.get('Pago'), 50), ss(r.get('Cambio'), 50), ss(r.get('Hora'), 50),
            iint(r.get('Id_Usuario')),
            num(r.get('Abono')),
            pagada,
            iint(r.get('CodigoEmp')),
            iint(r.get('Modifi')),
            dtp(r.get('FechaMod')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
            if n % 20000 == 0:
                print(f'  {n:,}...')
    flush(cur, sql, buf)
    cn.commit()
    print(f'  insertados: {n}')


def migrar_detalle_venta(cn, cur, indir):
    print('=== DETALLE_VENTA ===')
    cur.execute('DELETE FROM tbldetalle_venta')
    sql = """INSERT INTO tbldetalle_venta
        (Id_DetalleVenta, Factura_N, Factura_NTemp, Items, DescripcionTemp,
         Cantidad, PrecioC, PrecioV, Impuesto, Subtotal, Dev, IVA, Descuento,
         Entregado, Cant_Mod, PrecioV_Mod, PrecioC_Mod)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblDetalle_Venta'):
        buf.append((
            iint(r.get('Id_DetalleVenta')), iint(r.get('Factura_N')),
            ss(r.get('Factura_NTemp'), 100),
            iint(r.get('Items')), ss(r.get('DescripcionTemp'), 500),
            num(r.get('Cantidad')), num(r.get('PrecioC')), num(r.get('PrecioV')),
            num(r.get('Impuesto')), num(r.get('Subtotal')), num(r.get('Dev')),
            iint(r.get('IVA')), num(r.get('Descuento')),
            ss(r.get('Entregado'), 1, 'S'),
            iint(r.get('Cant_Mod')), num(r.get('PrecioV_Mod')),
            num(r.get('PrecioC_Mod')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
            if n % 50000 == 0:
                print(f'  {n:,}...')
    flush(cur, sql, buf)
    cn.commit()
    print(f'  insertados: {n}')


def migrar_pagos(cn, cur, indir):
    print('=== PAGOS ===')
    cur.execute('DELETE FROM tblpagos')
    sql = """INSERT INTO tblpagos
        (Id_Pagos, RecCajaN, Codigo, Fact_N, ValorPago, Fecha, DetallePago,
         ValorFact, SaldoAct, Descuento, Retencion, IVARetenido, Estado,
         Afectada, Cuentas, SaldoTotal, NFactAnt, Fact_Plan, Cedula,
         RecibidoDe, NRemision, FechaMod)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblPagos'):
        buf.append((
            iint(r.get('Id_Pagos')), iint(r.get('RecCajaN')),
            iint(r.get('Codigo')), iint(r.get('Fact_N')),
            num(r.get('ValorPago')), dtp(r.get('Fecha')),
            ss(r.get('DetallePago'), 200),
            num(r.get('ValorFact')), num(r.get('SaldoAct')),
            num(r.get('Descuento')), num(r.get('Retencion')),
            num(r.get('IVARetenido')),
            ss(r.get('Estado'), 10, 'Activo'),
            ss(r.get('Afectada'), 50), ss(r.get('Cuentas'), 80),
            num(r.get('SaldoTotal')), ss(r.get('NFactAnt'), 15),
            iint(r.get('Fact_Plan')),
            ss(r.get('Cedula'), 20), ss(r.get('RecibidoDe'), 60),
            iint(r.get('NRemision')), dtp(r.get('FechaMod')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
    flush(cur, sql, buf)
    cn.commit()
    print(f'  insertados: {n}')


def migrar_pedidos(cn, cur, indir):
    print('=== PEDIDOS + DETALLE_PEDIDO ===')
    cur.execute('DELETE FROM tbldetalle_pedido')
    cur.execute('DELETE FROM tblpedidos')
    sql_ped = """INSERT INTO tblpedidos
        (Pedido_N, FacturaCompra_N, N_Mes, anio, Fecha, TipoPedido, Dias,
         CodigoPro, Impuesto, Descuento, Flete, Total, Saldo, EstadoPedido,
         Comentario, Retencion)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n_ped = 0
    for r in rows(indir, 'tblPedidos'):
        f = dtp(r.get('Fecha'))
        anio = iint(r.get('Año') or r.get('Anio') or r.get('Año'))
        if not anio and f:
            anio = f.year
        buf.append((
            iint(r.get('Pedido_N')), ss(r.get('FacturaCompra_N'), 50),
            iint(r.get('N_Mes')), anio, f,
            ss(r.get('TipoPedido'), 8), iint(r.get('Dias')),
            iint(r.get('CodigoPro')),
            num(r.get('Impuesto')), num(r.get('Descuento')),
            num(r.get('Flete')), num(r.get('Total')), num(r.get('Saldo')),
            ss(r.get('EstadoPedido'), 15), ss(r.get('Comentario')),
            num(r.get('Retencion')),
        ))
        n_ped += 1
        if len(buf) >= BATCH:
            flush(cur, sql_ped, buf)
    flush(cur, sql_ped, buf)
    cn.commit()
    print(f'  pedidos insertados: {n_ped}')

    sql_det = """INSERT INTO tbldetalle_pedido
        (Id_DetallePedido, Pedido_N, Items, Cantidad, PrecioC, PrecioV,
         Impuesto, Subtotal, Dev)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblDetalle_Pedido'):
        buf.append((
            iint(r.get('Id_DetallePedido')), iint(r.get('Pedido_N')),
            iint(r.get('Items')), num(r.get('Cantidad')),
            num(r.get('PrecioC')), num(r.get('PrecioV')),
            num(r.get('Impuesto')), num(r.get('Subtotal')),
            num(r.get('Dev')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql_det, buf)
    flush(cur, sql_det, buf)
    cn.commit()
    print(f'  detalle_pedido insertados: {n}')


def migrar_caja_egresos_banco(cn, cur, indir):
    print('=== CONTROLCAJA ===')
    cur.execute('DELETE FROM tblcontrolcaja')
    sql = """INSERT INTO tblcontrolcaja
        (Cod_ControlCaja, Fecha, ValorInicalCaja, Villetes, Monedas, Cheques,
         ValorTotal, SaldoEnLibros, Diferencia, Base, Estado, VContado, VCredito,
         Pagos, Egresos, VInventario, Id_Usuario, FechaCierre)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    for r in rows(indir, 'tblControlCaja'):
        buf.append((
            iint(r.get('Cod_ControlCaja')), dtp(r.get('Fecha')),
            num(r.get('ValorInicalCaja')), num(r.get('Villetes')),
            num(r.get('Monedas')), num(r.get('Cheques')),
            num(r.get('ValorTotal')), num(r.get('SaldoEnLibros')),
            num(r.get('Diferencia')), num(r.get('Base')),
            1 if r.get('Estado') in (True, 1, '1') else 0,
            num(r.get('VContado')), num(r.get('VCredito')),
            num(r.get('Pagos')), num(r.get('Egresos')),
            num(r.get('VInventario')), iint(r.get('Id_Usuario')),
            dtp(r.get('FechaCierre')),
        ))
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
    flush(cur, sql, buf)
    cn.commit()

    print('=== EGRESOS ===')
    cur.execute('DELETE FROM tblegresos')
    sql = """INSERT INTO tblegresos
        (Id_Egresos, N_Comprobante, Fecha, Orden, Concepto, Suma, Valor,
         Descuento, Estado, Cuentas, FactN, CodigoPro, NFacturaAnt, ValorFact,
         Saldoact, Cedula, TipoPago)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    n = 0
    for r in rows(indir, 'tblEgresos'):
        buf.append((
            iint(r.get('Id_Egresos')), iint(r.get('N_Comprobante')),
            dtp(r.get('Fecha')),
            ss(r.get('Orden'), 50), ss(r.get('Concepto'), 90),
            ss(r.get('Suma'), 100), num(r.get('Valor')),
            num(r.get('Descuento')),
            ss(r.get('Estado'), 15, 'Activo'),
            ss(r.get('Cuentas'), 80),
            ss(r.get('FactN'), 15),
            iint(r.get('CodigoPro')),
            ss(r.get('NFacturaAnt'), 20),
            num(r.get('ValorFact')), num(r.get('Saldoact')),
            ss(r.get('Cedula'), 20), iint(r.get('TipoPago')),
        ))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
    flush(cur, sql, buf)
    cn.commit()
    print(f'  egresos: {n}')

    print('=== AUXILIAR_BANCO ===')
    cur.execute('DELETE FROM tblauxiliarbanco')
    cur.execute('SHOW COLUMNS FROM tblauxiliarbanco')
    cols_destino = {c[0].lower(): c[0] for c in cur.fetchall()}
    first = next(rows(indir, 'tblAuxiliarBanco'), None)
    if first is None:
        return
    cols_match = [(co, cols_destino[co.lower()])
                  for co in first.keys() if co.lower() in cols_destino]
    nombres = [cd for _, cd in cols_match]
    cur.execute(
        "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns "
        "WHERE TABLE_NAME='tblauxiliarbanco' AND TABLE_SCHEMA=DATABASE()")
    tipos = {r[0]: r[1] for r in cur.fetchall()}
    sql = (f"INSERT INTO tblauxiliarbanco ({', '.join(nombres)}) "
           f"VALUES ({', '.join(['%s']*len(cols_match))})")
    buf = []
    n = 0
    for r in rows(indir, 'tblAuxiliarBanco'):
        row = []
        for co, cd in cols_match:
            v = r.get(co)
            if tipos.get(cd) in ('datetime', 'date', 'timestamp') and isinstance(v, str):
                v = dtp(v)
            row.append(v)
        buf.append(tuple(row))
        n += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
    flush(cur, sql, buf)
    cn.commit()
    print(f'  auxiliar_banco: {n}')


def migrar_kardex(cn, cur, indir, corte):
    print(f'=== KARDEX (desde {corte.date()}) ===')
    cur.execute('DELETE FROM tblkardex')
    sql = """INSERT INTO tblkardex
        (Id_kardex, Fecha, Mes, Items, Detalle, C_D, Cant_Ent, Cost_Ent,
         Cant_Sal, Cost_Sal, Cant_Saldo, Cost_Saldo, Cost_Unit)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
    buf = []
    src = ins = 0
    for r in rows(indir, 'tblKardex'):
        src += 1
        f = dtp(r.get('Fecha'))
        if not f or f < corte:
            continue
        buf.append((
            iint(r.get('Id_kardex')), f, ss(r.get('Mes'), 15),
            iint(r.get('Items')), ss(r.get('Detalle'), 260),
            iint(r.get('C_D')), num(r.get('Cant_Ent')),
            num(r.get('Cost_Ent')), num(r.get('Cant_Sal')),
            num(r.get('Cost_Sal')), num(r.get('Cant_Saldo')),
            num(r.get('Cost_Saldo')), num(r.get('Cost_Unit')),
        ))
        ins += 1
        if len(buf) >= BATCH:
            flush(cur, sql, buf)
            if ins % 50000 == 0:
                print(f'  {ins:,}...')
    flush(cur, sql, buf)
    cn.commit()
    print(f'  kardex: {ins:,} de {src:,} ({src - ins:,} pre-corte omitidos)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jsonl', required=True, help='Carpeta con los *.jsonl exportados')
    ap.add_argument('--db', required=True, help='Nombre de la BD destino')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--user', default='root')
    ap.add_argument('--pwd', default='root')
    ap.add_argument('--corte-kardex', required=True,
                    help='YYYY-MM-DD — kardex se migra solo desde esta fecha')
    args = ap.parse_args()

    corte = dt.datetime.strptime(args.corte_kardex, '%Y-%m-%d')
    indir = Path(args.jsonl)
    if not indir.exists():
        sys.exit(f'ERR: no existe {indir}')

    cn = pymysql.connect(host=args.host, user=args.user, password=args.pwd,
                         database=args.db, charset='utf8mb4', autocommit=False)
    cur = cn.cursor()

    migrar_catalogos(cn, cur, indir)
    migrar_proveedores(cn, cur, indir)
    migrar_clientes(cn, cur, indir)
    migrar_articulos(cn, cur, indir)
    migrar_ventas(cn, cur, indir)
    migrar_detalle_venta(cn, cur, indir)
    migrar_pagos(cn, cur, indir)
    migrar_pedidos(cn, cur, indir)
    migrar_caja_egresos_banco(cn, cur, indir)
    migrar_kardex(cn, cur, indir, corte)

    cn.close()
    print('\n[OK] migración completa.')


if __name__ == '__main__':
    main()
