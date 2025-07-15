# 🚨 Debugging 400 Bad Request Error - Registration Endpoint

## ✅ Backend Status: WORKING

The backend API is operational and validation is working correctly.

## 🔍 Common Causes of 400 Error

### 1. **Missing Required Fields**

Ensure your frontend sends ALL required fields:

```javascript
// ✅ CORRECT - All required fields
const registrationData = {
  username: 'player123', // 3-30 chars, alphanumeric + underscore only
  email: 'user@example.com', // Valid email format
  password: 'password123', // Minimum 6 characters
  firstName: 'John', // Not empty
  lastName: 'Doe', // Not empty
};

// ❌ INCORRECT - Missing fields will cause 400 error
const badData = {
  username: 'player123',
  email: 'user@example.com',
  // Missing password, firstName, lastName
};
```

### 2. **Field Validation Rules**

| Field       | Requirements                                        |
| ----------- | --------------------------------------------------- |
| `username`  | 3-30 characters, only letters, numbers, underscores |
| `email`     | Valid email format                                  |
| `password`  | Minimum 6 characters                                |
| `firstName` | Not empty, will be trimmed                          |
| `lastName`  | Not empty, will be trimmed                          |

### 3. **User Already Exists**

If you get a 400 error with message "Email already registered" or "Username already taken", try different credentials.

### 4. **Frontend Request Format Issues**

#### ✅ Correct Frontend Implementation:

```javascript
// api/auth.js
import api from './axiosConfig'; // Your configured axios instance

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', {
      username: userData.username.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
    });

    return response.data;
  } catch (error) {
    // Handle validation errors
    if (error.response?.status === 400) {
      throw {
        message: error.response.data.message,
        errors: error.response.data.errors || [],
      };
    }
    throw error;
  }
};
```

#### ✅ React Component Example:

```javascript
// components/RegisterForm.jsx
import React, { useState } from 'react';
import { registerUser } from '../api/auth';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      // Validate all fields are filled
      const requiredFields = [
        'username',
        'email',
        'password',
        'firstName',
        'lastName',
      ];
      const missingFields = requiredFields.filter(
        (field) => !formData[field].trim()
      );

      if (missingFields.length > 0) {
        setErrors([
          {
            message: `Please fill in all required fields: ${missingFields.join(
              ', '
            )}`,
          },
        ]);
        return;
      }

      const result = await registerUser(formData);
      console.log('Registration successful:', result);

      // Store token and redirect
      localStorage.setItem('authToken', result.data.token);
      // Redirect to dashboard or home
    } catch (error) {
      console.error('Registration error:', error);

      if (error.errors && Array.isArray(error.errors)) {
        setErrors(error.errors);
      } else {
        setErrors([{ message: error.message || 'Registration failed' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
        />
      </div>

      <div>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          minLength={6}
        />
      </div>

      <div>
        <input
          type="text"
          placeholder="First Name"
          value={formData.firstName}
          onChange={(e) =>
            setFormData({ ...formData, firstName: e.target.value })
          }
          required
        />
      </div>

      <div>
        <input
          type="text"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={(e) =>
            setFormData({ ...formData, lastName: e.target.value })
          }
          required
        />
      </div>

      {/* Display validation errors */}
      {errors.length > 0 && (
        <div className="error-container">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              {error.msg || error.message}
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;
```

## 🛠 **Debugging Steps**

### Step 1: Check Request Payload

Open browser DevTools → Network tab → Find the registration request → Check the request payload:

```json
{
  "username": "player123",
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Step 2: Check Response Details

Look at the response body for specific error messages:

```json
// Validation errors
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "msg": "Username must be between 3 and 30 characters",
      "path": "username"
    }
  ]
}

// User exists error
{
  "success": false,
  "message": "Email already registered"
}
```

### Step 3: Test with Different Data

Try registering with completely new credentials:

```javascript
const testUser = {
  username: `testuser${Date.now()}`, // Unique username
  email: `test${Date.now()}@example.com`, // Unique email
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
};
```

## 🚀 **Quick Test Commands**

Test the endpoint directly:

```bash
# Test successful registration (replace with unique data)
curl -X POST https://bracketesports-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "uniqueuser123",
    "email": "unique@test.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test validation error (missing fields)
curl -X POST https://bracketesports-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test"}'
```

## 📞 **Still Having Issues?**

If you're still getting 400 errors:

1. **Check the exact request being sent** in browser DevTools
2. **Verify all required fields** are present and valid
3. **Try with completely unique credentials** (new email/username)
4. **Check for extra spaces** or special characters in the data
5. **Verify Content-Type header** is set to `application/json`

The backend is working correctly - the issue is likely in the frontend request format or data validation.
