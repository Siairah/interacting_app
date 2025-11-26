'use client';

import React, { useState } from 'react';
import CommentSectionFixed from '@/components/CommentSectionFixed';

export default function TestCommentsFixedPage() {
  const [postId, setPostId] = useState('676a1234567890abcdef1234');
  const [userId, setUserId] = useState('676a1234567890abcdef5678');

  const testAddComment = async () => {
    try {
      console.log('Testing add comment...');
      const response = await fetch(`http://localhost:5000/add-comment/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId, 
          content: `Test comment at ${new Date().toLocaleTimeString()}` 
        }),
      });
      
      const data = await response.json();
      console.log('Add comment result:', data);
      alert(`Add comment result: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Add comment error:', error);
      alert(`Add comment error: ${error}`);
    }
  };

  const testGetComments = async () => {
    try {
      console.log('Testing get comments...');
      const response = await fetch(`http://localhost:5000/get-comments/${postId}`);
      const data = await response.json();
      console.log('Get comments result:', data);
      alert(`Get comments result: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Get comments error:', error);
      alert(`Get comments error: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test Fixed Comments</h1>
      <p>This page tests the fixed comment functionality that works like Django.</p>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>Configuration</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Post ID:
          </label>
          <input 
            type="text" 
            value={postId} 
            onChange={(e) => setPostId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            User ID:
          </label>
          <input 
            type="text" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testGetComments}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Get Comments API
        </button>
        
        <button 
          onClick={testAddComment}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Add Comment API
        </button>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: '#fff', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>Fixed Comment Section</h3>
        <p>Click the "Comments" button below to test the Django-like comment functionality:</p>
        
        <CommentSectionFixed
          postId={postId}
          userId={userId}
        />
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#d1ecf1', 
        borderRadius: '8px',
        border: '1px solid #bee5eb'
      }}>
        <h3>How to Test:</h3>
        <ol>
          <li><strong>Get Real IDs:</strong> Go to <code>/get-ids</code> to get real Post and User IDs</li>
          <li><strong>Test API:</strong> Click "Test Get Comments API" to verify the backend works</li>
          <li><strong>Add Comment:</strong> Click "Test Add Comment API" to add a test comment</li>
          <li><strong>Test UI:</strong> Click the "Comments" button above to see the Django-like interface</li>
          <li><strong>Add Comment via UI:</strong> Type a comment and submit it</li>
        </ol>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h3>Expected Django-like Behavior:</h3>
        <ul>
          <li><strong>Click Comments Button:</strong> Comments section expands to show existing comments</li>
          <li><strong>User Profiles:</strong> Each comment shows user name and profile picture</li>
          <li><strong>Add Comment:</strong> Form appears at the top to add new comments</li>
          <li><strong>Real-time Updates:</strong> New comments appear immediately</li>
          <li><strong>Comment Count:</strong> Button shows correct number of comments</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f8d7da', 
        borderRadius: '8px',
        border: '1px solid #f5c6cb'
      }}>
        <h3>Troubleshooting:</h3>
        <ul>
          <li>Make sure your backend server is running on port 5000</li>
          <li>Use valid MongoDB ObjectIds for Post ID and User ID</li>
          <li>Check browser console for any API errors</li>
          <li>Verify that the post exists in your database</li>
          <li>Check that users exist in your database</li>
        </ul>
      </div>
    </div>
  );
}
