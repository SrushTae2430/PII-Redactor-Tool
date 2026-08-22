import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/Auth/AuthScreen';
import { UploadHub } from './components/Dashboard/UploadHub';
import { StudioLayout } from './components/Studio/StudioLayout';
import type { ProcessedDocument, ProcessingOptions } from './types';
import { wipeSessionDataApi } from './services/api';

export function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<'AUTH' | 'DASHBOARD' | 'STUDIO'>('AUTH');
  
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions | null>(null);

  const handleAuthenticate = (email: string, accessToken: string) => {
    setUserEmail(email);
    setToken(accessToken);
    setCurrentView('DASHBOARD');
  };

  const handleDocumentProcessed = (doc: ProcessedDocument, file: File, options: ProcessingOptions) => {
    setProcessedDoc(doc);
    setRawFile(file);
    setProcessingOptions(options);
    setCurrentView('STUDIO');
  };

  const handleWipeData = async () => {
    await wipeSessionDataApi(token || undefined);
    setProcessedDoc(null);
    setRawFile(null);
    setProcessingOptions(null);
    setCurrentView('DASHBOARD');
    alert("All in-memory document buffers, active tags, and session tokens have been wiped completely.");
  };

  const handleLogout = () => {
    setUserEmail(null);
    setToken(null);
    setProcessedDoc(null);
    setRawFile(null);
    setCurrentView('AUTH');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {currentView !== 'AUTH' && (
        <Navbar
          userEmail={userEmail}
          onWipeData={handleWipeData}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'AUTH' && (
        <AuthScreen onAuthenticate={handleAuthenticate} />
      )}

      {currentView === 'DASHBOARD' && (
        <UploadHub onDocumentProcessed={handleDocumentProcessed} />
      )}

      {currentView === 'STUDIO' && processedDoc && rawFile && processingOptions && (
        <StudioLayout
          doc={processedDoc}
          rawFile={rawFile}
          initialOptions={processingOptions}
          onBackToDashboard={() => setCurrentView('DASHBOARD')}
        />
      )}

    </div>
  );
}

export default App;
