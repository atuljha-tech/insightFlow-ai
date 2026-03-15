import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

class ExportUtils {
  exportAsJSON(dashboardData: any[], arg1: string) {
    throw new Error('Method not implemented.');
  }
  /**
   * Export dashboard as PNG
   */
  async exportAsPNG(elementId: string, filename: string = 'dashboard'): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Dashboard element not found');
    }

    try {
      const canvas = await html2canvas(element, {
        background: '#111827',
        allowTaint: true,
        useCORS: true,
        logging: false
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG export failed:', error);
      throw error;
    }
  }

  /**
   * Export dashboard as PDF
   */
  async exportAsPDF(elementId: string, filename: string = 'dashboard'): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Dashboard element not found');
    }

    try {
      const canvas = await html2canvas(element, {
        background: '#111827',
        allowTaint: true,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  /**
   * Export data as CSV
   */
  exportAsCSV(data: any[], filename: string = 'data'): void {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      csvRows.push(values.join(','));
    }

    // Create download
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  /**
   * Generate shareable link (simulated)
   */
  generateShareLink(dashboardState: any): string {
    // In a real app, this would save to a database and return a unique link
    const stateString = btoa(JSON.stringify(dashboardState));
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${stateString}`;
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }
}

export const exportUtils = new ExportUtils();