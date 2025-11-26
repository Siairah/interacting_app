'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReportedPostsPage() {
  const params = useParams();
  const circleId = params.id as string;

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
      padding: '20px',
      textAlign: 'center'
    }}>
      <i className="fas fa-flag" style={{ fontSize: '64px', color: '#e74c3c', marginBottom: '20px' }}></i>
      <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Reported Posts</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>This feature will show posts reported by users. Coming soon!</p>
      <Link 
        href={`/circle/${circleId}/manage`}
        style={{
          display: 'inline-block',
          padding: '12px 30px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '25px',
          fontWeight: '600',
          marginRight: '10px'
        }}
      >
        Go to Manage Circle
      </Link>
      <Link 
        href={`/circle/${circleId}`}
        style={{
          display: 'inline-block',
          padding: '12px 30px',
          background: 'white',
          color: '#667eea',
          textDecoration: 'none',
          borderRadius: '25px',
          fontWeight: '600',
          border: '2px solid #667eea'
        }}
      >
        Back to Circle
      </Link>
    </div>
  );
}

