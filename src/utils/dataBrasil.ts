/**
 * Utilitários para trabalhar com datas no timezone do Brasil (America/Sao_Paulo)
 */

/**
 * Obtém a data atual no timezone do Brasil
 * @returns Date - Data atual no timezone do Brasil
 */
export const obterDataBrasil = (): Date => {
  const now = new Date();
  const brasiliaTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  return new Date(brasiliaTime);
};

/**
 * Obtém a data atual no formato YYYY-MM-DD no timezone do Brasil
 * @returns string - Data no formato YYYY-MM-DD
 */
export const obterDataBrasilFormatada = (): string => {
  const now = new Date();
  const brasiliaTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  return brasiliaTime;
};

/**
 * Verifica se uma data é hoje no timezone do Brasil
 * @param data - Data a ser verificada
 * @returns boolean - True se é hoje no Brasil
 */
export const ehHojeBrasil = (data: string | Date): boolean => {
  const dataBrasil = obterDataBrasilFormatada();

  let dataComparacao: string;
  if (typeof data === 'string') {
    dataComparacao = data.split('T')[0];
  } else {
    const dataObj = new Date(data);
    dataComparacao = dataObj.toISOString().split('T')[0];
  }

  return dataComparacao === dataBrasil;
};

/**
 * Formata uma data para o formato brasileiro considerando timezone
 * @param data - Data a ser formatada
 * @returns string - Data formatada no formato dd/MM/yyyy
 */
export const formatarDataBrasilComTimezone = (data: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(data);
};