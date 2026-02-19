"use server"

import { prisma } from "@/src/lib/prisma"
import { getRoleName } from "@/src/utils/rolesName"

type EmployeeSalesParams = {
  startDate?: string
  endDate?: string
}

export async function getEmployeeSales(params: EmployeeSalesParams = {}) {
  try {
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Obtener ventas del período
    const ventas = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        usuarioRegistro: true,
        total: true,
        fechaVenta: true,
        numeroVenta: true
      }
    })

    // Obtener información de empleados
    const empleados = await prisma.persona.findMany({
      where: {
        estado: 1
      },
      select: {
        id: true,
        primerNombre: true,
        segundoNombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        rol: true
      }
    })

    // Mapear empleados para acceso rápido
    const empleadosMap = new Map(
      empleados.map(e => [
        e.id,
        {
          nombre: `${e.primerNombre} ${e.apellidoPaterno}`,
          nombreCompleto: `${e.primerNombre} ${e.segundoNombre || ''} ${e.apellidoPaterno} ${e.apellidoMaterno}`.trim(),
          rol: e.rol
        }
      ])
    )

    // Inicializar TODOS los empleados con valores en 0
    const empleadoData: Record<number, {
      empleadoID: number
      nombre: string
      nombreCompleto: string
      rol: number
      rolNombre: string
      numeroVentas: number
      totalVentas: number
      ticketPromedio: number
      mejorVenta: number
      ventasPorDia: Record<string, number>
    }> = {}

    // Crear entrada para cada empleado (incluso si no tienen ventas)
    empleados.forEach(e => {
      empleadoData[e.id] = {
        empleadoID: e.id,
        nombre: `${e.primerNombre} ${e.apellidoPaterno}`,
        nombreCompleto: `${e.primerNombre} ${e.segundoNombre || ''} ${e.apellidoPaterno} ${e.apellidoMaterno}`.trim(),
        rol: e.rol,
        rolNombre: getRoleName(e.rol),
        numeroVentas: 0,
        totalVentas: 0,
        ticketPromedio: 0,
        mejorVenta: 0,
        ventasPorDia: {}
      }
    })

    // Procesar ventas y actualizar datos de empleados
    ventas.forEach(venta => {
      const empleadoID = venta.usuarioRegistro
      
      // Si el empleado no existe en el map, continuar
      if (!empleadoData[empleadoID]) return

      const empleado = empleadoData[empleadoID]
      const total = venta.total.toNumber()
      
      empleado.numeroVentas += 1
      empleado.totalVentas += total
      
      if (total > empleado.mejorVenta) {
        empleado.mejorVenta = total
      }

      // Ventas por día
      if (venta.fechaVenta) {
        const fecha = venta.fechaVenta.toISOString().split('T')[0]
        empleado.ventasPorDia[fecha] = (empleado.ventasPorDia[fecha] || 0) + total
      }
    })

    // Calcular ticket promedio
    Object.values(empleadoData).forEach(emp => {
      emp.ticketPromedio = emp.numeroVentas > 0 ? emp.totalVentas / emp.numeroVentas : 0
    })

    const empleadosArray = Object.values(empleadoData)

    // Comparación entre empleados
    const totalVentasGlobal = empleadosArray.reduce((sum, e) => sum + e.totalVentas, 0)
    
    // Calcular promedio solo con empleados que tienen ventas
    const empleadosConVentas = empleadosArray.filter(e => e.numeroVentas > 0)
    const promedioVentasPorEmpleado = empleadosConVentas.length > 0 
      ? totalVentasGlobal / empleadosConVentas.length 
      : 0
    
    const empleadosConComparacion = empleadosArray.map(e => ({
      ...e,
      porcentajeDelTotal: totalVentasGlobal > 0 ? (e.totalVentas / totalVentasGlobal) * 100 : 0,
      diferenciaConPromedio: e.totalVentas - promedioVentasPorEmpleado,
      rendimiento: e.numeroVentas === 0 ? 'bajo' as const : // Sin ventas = bajo
                   e.totalVentas >= promedioVentasPorEmpleado * 1.2 ? 'alto' as const :
                   e.totalVentas >= promedioVentasPorEmpleado * 0.8 ? 'medio' as const : 
                   'bajo' as const
    }))

    // Top empleados (ahora con las propiedades de comparación)
    const topVentas = [...empleadosConComparacion]
      .sort((a, b) => b.totalVentas - a.totalVentas)
      .map(({ ventasPorDia, ...emp }) => emp)
    
    const topNumeroVentas = [...empleadosConComparacion]
      .sort((a, b) => b.numeroVentas - a.numeroVentas)
      .map(({ ventasPorDia, ...emp }) => emp)
    
    const topTicketPromedio = [...empleadosConComparacion]
      .filter(e => e.numeroVentas >= 5) // Mínimo 5 ventas
      .sort((a, b) => b.ticketPromedio - a.ticketPromedio)
      .map(({ ventasPorDia, ...emp }) => emp)

    // Análisis por turno (basado en hora de venta)
    const turnoData: Record<string, {
      turno: string
      numeroVentas: number
      totalVentas: number
      ticketPromedio: number
    }> = {
      manana: { turno: 'Mañana (6-12)', numeroVentas: 0, totalVentas: 0, ticketPromedio: 0 },
      tarde: { turno: 'Tarde (12-18)', numeroVentas: 0, totalVentas: 0, ticketPromedio: 0 },
      noche: { turno: 'Noche (18-24)', numeroVentas: 0, totalVentas: 0, ticketPromedio: 0 }
    }

    ventas.forEach(venta => {
      if (!venta.fechaVenta) return
      
      const hora = venta.fechaVenta.getHours()
      const total = venta.total.toNumber()
      
      let turno: 'manana' | 'tarde' | 'noche' = 'tarde'
      if (hora >= 6 && hora < 12) turno = 'manana'
      else if (hora >= 18) turno = 'noche'
      
      turnoData[turno].numeroVentas += 1
      turnoData[turno].totalVentas += total
    })

    // Calcular ticket promedio por turno
    Object.values(turnoData).forEach(t => {
      t.ticketPromedio = t.numeroVentas > 0 ? t.totalVentas / t.numeroVentas : 0
    })

    const turnos = Object.values(turnoData)

    // Ventas por día del equipo
    const ventasPorDia: Record<string, number> = {}
    ventas.forEach(v => {
      if (!v.fechaVenta) return
      const fecha = v.fechaVenta.toISOString().split('T')[0]
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + v.total.toNumber()
    })

    const ventasDiarias = Object.entries(ventasPorDia)
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    // Estadísticas generales
    const totalVentas = ventas.length
    const totalIngresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0)
    const ticketPromedioGlobal = totalVentas > 0 ? totalIngresos / totalVentas : 0
    const ventasPorEmpleado = empleadosConVentas.length > 0 ? totalVentas / empleadosConVentas.length : 0

    // Empleados que necesitan capacitación (rendimiento bajo Y tienen ventas)
    const necesitanCapacitacion = empleadosConComparacion
      .filter(e => e.rendimiento === 'bajo' && e.numeroVentas >= 5)
      .sort((a, b) => a.totalVentas - b.totalVentas)
      .map(({ ventasPorDia, ...emp }) => emp)

    // Eliminar ventasPorDia de todos los empleados para el frontend
    const empleadosParaFrontend = empleadosConComparacion.map(({ ventasPorDia, ...emp }) => emp)

    return {
      success: true,
      data: {
        empleados: empleadosParaFrontend,
        topVentas: topVentas.slice(0, 10),
        topNumeroVentas: topNumeroVentas.slice(0, 10),
        topTicketPromedio: topTicketPromedio.slice(0, 10),
        turnos,
        ventasDiarias,
        necesitanCapacitacion,
        estadisticas: {
          totalEmpleados: empleadosConComparacion.length,
          totalVentas,
          totalIngresos,
          ticketPromedioGlobal,
          ventasPorEmpleado,
          promedioVentasPorEmpleado,
          empleadosAltoRendimiento: empleadosConComparacion.filter(e => e.rendimiento === 'alto' && e.numeroVentas > 0).length,
          empleadosMedioRendimiento: empleadosConComparacion.filter(e => e.rendimiento === 'medio' && e.numeroVentas > 0).length,
          empleadosBajoRendimiento: empleadosConComparacion.filter(e => e.rendimiento === 'bajo' && e.numeroVentas > 0).length
        },
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fin: endDate.toISOString().split('T')[0]
        }
      }
    }

  } catch (error) {
    console.error("Error en getEmployeeSales:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al analizar ventas por empleado"
    }
  }
}

