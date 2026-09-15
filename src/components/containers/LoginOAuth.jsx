import React from 'react';
import { useDispatch } from 'react-redux';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

import { setLogin } from '../../loginSlice';
import { setUser, clearUser } from './userSlice';

function LoginOAuth() {
  const dispatch = useDispatch();

  const onLoginSuccess = (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        console.error('Google no devolvió una credencial.');
        return;
      }

      const profile = jwtDecode(credentialResponse.credential);

      console.log('Login exitoso:', profile.name);
      console.log('Email:', profile.email);

      dispatch(
        setUser({
          name: profile.name,
          email: profile.email,
          role: 'user',
          isOwner: false,
        })
      );

      dispatch(setLogin(true));
    } catch (error) {
      console.error('Error procesando el login de Google:', error);
    }
  };

  const onLoginFailure = () => {
    console.error('Login de Google fallido.');
  };

  const onLogout = () => {
    try {
      googleLogout();
    } catch (error) {
      console.warn('Error cerrando sesión de Google:', error);
    }

    dispatch(clearUser());
    dispatch(setLogin(false));
  };

  return (
    <div>
      <GoogleLogin
        onSuccess={onLoginSuccess}
        onError={onLoginFailure}
        useOneTap={false}
      />

      <button
        type="button"
        onClick={onLogout}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          cursor: 'pointer',
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default LoginOAuth;