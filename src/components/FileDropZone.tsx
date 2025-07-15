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
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
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

    console.log('Starting upload process for', files.length, 'files');
    setUploading(true);
    let uploadedCount = 0;

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    try {
      for (const fileData of files) {
        // Add file size limit check (50MB = 50 * 1024 * 1024 bytes)
        const maxFileSize = 50 * 1024 * 1024; // 50MB
        if (fileData.file.size > maxFileSize) {
          toast({
            title: "File Too Large",
            description: `${fileData.name} is ${Math.round(fileData.file.size / 1024 / 1024)}MB. Maximum size is 50MB.`,
            variant: "destructive",
          });
          continue;
        }

        console.log('Uploading file:', fileData.name, 'Size:', Math.round(fileData.file.size / 1024), 'KB');
        
        try {
          // Generate unique filename to prevent conflicts
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}_${fileData.name}`;
          const storagePath = `${selectedFolder}/${uniqueFileName}`;

          console.log('Uploading to storage path:', storagePath);

          // Upload directly to Supabase Storage (more efficient for large files)
          const { data: storageData, error: storageError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileData.file, {
              contentType: fileData.file.type,
              upsert: false
            });

          if (storageError) {
            console.error('Storage upload error for', fileData.name, ':', storageError);
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${fileData.name}: ${storageError.message}`,
              variant: "destructive",
            });
            continue;
          }

          console.log('File uploaded to storage successfully:', fileData.name);

          // Save document metadata to database
          const { data: document, error: dbError } = await supabase
            .from('documents')
            .insert({
              name: fileData.name,
              file_path: storagePath,
              file_size: fileData.file.size,
              mime_type: fileData.file.type,
              category: selectedFolder,
              subcategory: fileData.subcategory || null,
              description: fileData.description || null,
              tags: fileData.tags ? fileData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
              uploaded_by: session.user.id,
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error for', fileData.name, ':', dbError);
            // Try to clean up the uploaded file if database insert fails
            try {
              await supabase.storage
                .from('documents')
                .remove([storagePath]);
              console.log('Cleaned up storage file after database error');
            } catch (cleanupError) {
              console.error('Failed to cleanup file after database error:', cleanupError);
            }
            
            toast({
              title: "Upload Failed",
              description: `Failed to save ${fileData.name} metadata: ${dbError.message}`,
              variant: "destructive",
            });
            continue;
          }

          // Log the upload action
          await supabase
            .from('audit_logs')
            .insert({
              action: 'upload',
              document_id: document.id,
              user_id: session.user.id,
              ip_address: 'unknown',
              user_agent: navigator.userAgent,
            });

          console.log('Successfully uploaded:', fileData.name);
          uploadedCount++;

        } catch (fileError) {
          console.error('Error processing file', fileData.name, ':', fileError);
          toast({
            title: "Upload Failed",
            description: `Failed to process ${fileData.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            variant: "destructive",
          });
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
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
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