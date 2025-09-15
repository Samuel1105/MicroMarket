// En un archivo utils/date.js
export function getBoliviaTime() {
    const fecha = new Date();
    // Ajustar para mantener la hora local
    fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
    return fecha;
}