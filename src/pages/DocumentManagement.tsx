import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Download, 
  FileText, 
  Plus, 
  Search,
  Eye,
  Share,
  Trash2,
  Folder
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string[] | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}

export default function DocumentManagement() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    tags: '',
    category: '',
    subcategory: ''
  });

  // Define your data room structure
  const dataRoomStructure = {
    "01_Company_Overview": [
      "01_Pitch Deck",
      "02_One Pager", 
      "03_Company Profile",
      "04_Introductory Video"
    ],
    "02_Financials": [
      "01_Audited Financial Statements",
      "02_Management Accounts (YTD)",
      "03_Financial Model",
      "04_Projections & Assumptions"
    ],
    "03_Product_and_Technology": [
      "01_Product Brochures",
      "02_Technical Whitepapers", 
      "03_IP_Filings_and_Patents",
      "04_Roadmap"
    ],
    "04_Market_Information": [
      "01_Market Research Reports",
      "02_Competitor Analysis",
      "03_Regulatory Landscape"
    ],
    "05_Team_and_Organization": [
      "01_Founder_Bios",
      "02_Key_Team_CVs",
      "03_Organization_Structure",
      "04_Board_and_Advisors"
    ],
    "06_Legal_and_Compliance": [
      "01_Company Incorporation Documents",
      "02_MOA_AOA",
      "03_Trademark_and_IP_Documents",
      "04_Regulatory_Certifications"
    ],
    "07_Contracts_and_Agreements": [
      "01_Customer_Contracts",
      "02_Partner_Agreements",
      "03_NDAs_and_MOUs"
    ],
    "08_Investor_Communications": [
      "01_Existing_Investor_List",
      "02_Previous_Rounds_Details",
      "03_Cap Table",
      "04_Shareholding_Structure"
    ],
    "09_Other_Key_Documents": [
      "01_Awards_and_Media",
      "02_Impact_Case_Studies",
      "03_Additional_Reference_Materials"
    ]
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDocuments(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description);
      formData.append('tags', uploadForm.tags);
      formData.append('category', uploadForm.category);
      formData.append('subcategory', uploadForm.subcategory);

      // Call edge function to handle upload
      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ name: '', description: '', tags: '', category: '', subcategory: '' });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-document', {
        body: { documentId: document.id },
      });

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log audit trail
      if (user) {
        await supabase.from('audit_logs').insert({
          action: 'download',
          document_id: document.id,
          user_id: user.id,
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent,
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const openShareDialog = (document: Document) => {
    setSelectedDocument(document);
    setIsShareDialogOpen(true);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">Upload, manage, and share secure documents</p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Upload a secure document to the dataroom
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Document Name</Label>
                <Input
                  id="name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter document name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value, subcategory: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (or leave blank)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(dataRoomStructure).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/^\d+_/, '').replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {uploadForm.category && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                  <Select
                    value={uploadForm.subcategory}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, subcategory: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subcategory (or leave blank)" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataRoomStructure[uploadForm.category as keyof typeof dataRoomStructure]?.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory.replace(/^\d+_/, '').replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the document"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || !selectedFile}>
                  {uploading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Documents ({filteredDocuments.length})
              </CardTitle>
              <CardDescription>
                Manage and share secure documents
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No documents match your search' : 'No documents uploaded yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {document.category && (
                          <div className="flex items-center text-sm">
                            <Folder className="mr-1 h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {document.category.replace(/^\d+_/, '').replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {document.subcategory && (
                          <div className="text-xs text-muted-foreground ml-4">
                            {document.subcategory.replace(/^\d+_/, '').replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{document.description || '-'}</TableCell>
                    <TableCell>{formatFileSize(document.file_size)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {document.tags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(document.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openShareDialog(document)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}