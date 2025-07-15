import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileDropZoneProps {
  selectedFolder: string;
  dataRoomStructure: Record<string, string[]>;
  onUploadComplete: () => void;
}

interface FileWithMetadata {
  file: File;
  id: string;
  name: string;
  description: string;
  subcategory: string;
  tags: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  selectedFolder,
  dataRoomStructure,
  onUploadComplete
}) => {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);

  const formatFolderName = (name: string) => {
    return name.replace(/^\d+_/, '').replace(/_/g, ' ');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const filesWithMetadata: FileWithMetadata[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      description: '',
      subcategory: '',
      tags: ''
    }));
    
    setFiles(prev => [...prev, ...filesWithMetadata]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<FileWithMetadata>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const fileData of files) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('name', fileData.name);
        formData.append('description', fileData.description);
        formData.append('tags', fileData.tags);
        formData.append('category', selectedFolder);
        formData.append('subcategory', fileData.subcategory);

        const { error } = await supabase.functions.invoke('upload-document', {
          body: formData,
        });

        if (error) {
          console.error('Upload error for', fileData.name, ':', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${fileData.name}: ${error.message}`,
            variant: "destructive",
          });
        } else {
          uploadedCount++;
        }
      }

      if (uploadedCount > 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${uploadedCount} of ${files.length} files`,
        });
        setFiles([]);
        onUploadComplete();
      }
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload to: {formatFolderName(selectedFolder)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Support for PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, MP4, and image files
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.jpg,.jpeg,.png,.gif"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </Label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Files to Upload ({files.length})</h4>
              {files.map((fileData) => (
                <Card key={fileData.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{fileData.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(fileData.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${fileData.id}`}>Document Name</Label>
                      <Input
                        id={`name-${fileData.id}`}
                        value={fileData.name}
                        onChange={(e) => updateFile(fileData.id, { name: e.target.value })}
                        placeholder="Enter document name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`subcategory-${fileData.id}`}>Subcategory</Label>
                      <Select
                        value={fileData.subcategory}
                        onValueChange={(value) => updateFile(fileData.id, { subcategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {dataRoomStructure[selectedFolder]?.map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {formatFolderName(subcategory)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${fileData.id}`}>Description</Label>
                      <Textarea
                        id={`description-${fileData.id}`}
                        value={fileData.description}
                        onChange={(e) => updateFile(fileData.id, { description: e.target.value })}
                        placeholder="Brief description (optional)"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tags-${fileData.id}`}>Tags</Label>
                      <Input
                        id={`tags-${fileData.id}`}
                        value={fileData.tags}
                        onChange={(e) => updateFile(fileData.id, { tags: e.target.value })}
                        placeholder="tag1, tag2, tag3 (optional)"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setFiles([])}>
                  Clear All
                </Button>
                <Button onClick={uploadFiles} disabled={uploading}>
                  {uploading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {files.length} File{files.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};