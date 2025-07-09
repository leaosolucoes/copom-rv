import { useState, useEffect } from 'react';

interface DataCompression {
  compress: (data: any) => string;
  decompress: (compressedData: string) => any;
  getCompressionRatio: (original: any, compressed: string) => number;
}

export const useDataCompression = (): DataCompression => {
  // Simple JSON compression using common patterns
  const compress = (data: any): string => {
    try {
      const jsonString = JSON.stringify(data);
      
      // Basic compression patterns for common complaint data
      const compressed = jsonString
        // Replace common field names with shorter versions
        .replace(/"complainant_/g, '"c_')
        .replace(/"occurrence_/g, '"o_')
        .replace(/"classification"/g, '"cl"')
        .replace(/"narrative"/g, '"n"')
        .replace(/"timestamp"/g, '"t"')
        .replace(/"system_identifier"/g, '"si"')
        // Replace common values
        .replace(/"nova"/g, '"1"')
        .replace(/"cadastrada"/g, '"2"')
        .replace(/"finalizada"/g, '"3"')
        .replace(/"a_verificar"/g, '"4"')
        .replace(/"verificado"/g, '"5"')
        // Remove unnecessary whitespace
        .replace(/\s+/g, ' ')
        .trim();

      return btoa(compressed); // Base64 encode
    } catch (error) {
      console.error('Compression error:', error);
      return btoa(JSON.stringify(data)); // Fallback to basic encoding
    }
  };

  const decompress = (compressedData: string): any => {
    try {
      const decoded = atob(compressedData);
      
      // Reverse compression patterns
      const decompressed = decoded
        .replace(/"c_/g, '"complainant_')
        .replace(/"o_/g, '"occurrence_')
        .replace(/"cl"/g, '"classification"')
        .replace(/"n"/g, '"narrative"')
        .replace(/"t"/g, '"timestamp"')
        .replace(/"si"/g, '"system_identifier"')
        // Reverse status values
        .replace(/"1"/g, '"nova"')
        .replace(/"2"/g, '"cadastrada"')
        .replace(/"3"/g, '"finalizada"')
        .replace(/"4"/g, '"a_verificar"')
        .replace(/"5"/g, '"verificado"');

      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression error:', error);
      try {
        // Fallback to basic decoding
        return JSON.parse(atob(compressedData));
      } catch (fallbackError) {
        console.error('Fallback decompression failed:', fallbackError);
        return null;
      }
    }
  };

  const getCompressionRatio = (original: any, compressed: string): number => {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = compressed.length;
    return ((originalSize - compressedSize) / originalSize) * 100;
  };

  return {
    compress,
    decompress,
    getCompressionRatio
  };
};