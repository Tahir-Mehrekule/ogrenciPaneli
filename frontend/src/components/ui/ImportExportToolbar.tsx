import React, { useRef } from 'react';
import { Button } from './Button';
import { Download, Upload, Loader2, FileDown } from 'lucide-react';
import * as xlsx from 'xlsx';

interface ImportExportToolbarProps {
  onImport: (data: Record<string, unknown>[]) => Promise<void>;
  onExport: () => void;
  isExporting?: boolean;
  isImporting?: boolean;
}

export function ImportExportToolbar({
  onImport,
  onExport,
  isExporting = false,
  isImporting = false
}: ImportExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = xlsx.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet);
      await onImport(jsonData);
      
    } catch (error) {
      console.error("Excel okuma hatası:", error);
      alert("Dosya okunurken bir hata oluştu. Lütfen formatı kontrol edin.");
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        first_name: "Örnek",
        last_name: "Öğrenci",
        email: "ornek@ogrenci.com",
        student_no: "202610101",
        department_names: "Bilgisayar Mühendisliği, Yazılım Mühendisliği"
      }
    ];

    const ws = xlsx.utils.json_to_sheet(template);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Şablon");
    xlsx.writeFile(wb, "ogrenci_import_sablon.xlsx");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="text-green-400 hover:text-green-300 hover:border-green-400 border-gray-700 bg-gray-900/50"
      >
        {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        İçe Aktar
      </Button>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDownloadTemplate}
        className="text-gray-400 hover:text-white border-gray-700 bg-gray-900/50"
        title="Örnek Excel Şablonunu İndir"
      >
        <FileDown className="w-4 h-4 mr-2" />
        Şablon İndir
      </Button>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onExport}
        disabled={isExporting}
        className="text-blue-400 hover:text-blue-300 hover:border-blue-400 border-gray-700 bg-gray-900/50"
      >
        {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Dışa Aktar
      </Button>
    </div>
  );
}
