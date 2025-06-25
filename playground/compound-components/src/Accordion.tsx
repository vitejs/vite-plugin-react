import React from 'react'

const Root: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '4px',
        margin: '16px 0',
      }}
    >
      <h3 style={{ padding: '12px', margin: '0', backgroundColor: '#f5f5f5' }}>
        Accordion Root
      </h3>
      <div style={{ padding: '12px' }}>{children}</div>
    </div>
  )
}

const Item: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        padding: '8px 12px',
        border: '1px solid #e0e0e0',
        margin: '4px 0',
        borderRadius: '2px',
        backgroundColor: '#fafafa',
      }}
    >
      {children}
    </div>
  )
}

export const Accordion = { Root, Item }
