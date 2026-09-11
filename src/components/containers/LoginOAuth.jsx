
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { GoogleLogin, GoogleLogout } from 'react-google-login';

import { setLogin } from '../../loginSlice';
import { setUser, clearUser } from './userSlice';

const clientId =
  '870413778352-3vtpln31uiods5s2v0epiioj72i624k8.apps.googleusercontent.com';

function LoginOAuth() {
  const [showLoginButton, setShowLoginButton] = useState(true);
  const [showLogoutButton, setShowLogoutButton] = useState(false);

  const dispatch = useDispatch();

  const onLoginSuccess = (res) => {
    const profile = res.profileObj;

    console.log('Login exitoso:', profile.name);
    console.log('Email:', profile.email);

    /*
      Por ahora todo usuario que entra con Google
      comienza como "user".

      Más adelante el backend decidirá si es:
      - owner
      - admin
      - user
    */

    dispatch(
      setUser({
        name: profile.name,
        email: profile.email,
        role: 'user',
        isOwner: false,
      })
    );

    dispatch(setLogin(true));

    setShowLoginButton(false);
    setShowLogoutButton(true);
  };

  const onLoginFailure = (res) => {
    console.log('Login fallido:', res);
  };

  const onSignoutSuccess = () => {
    console.log('Usuario cerró sesión');

    dispatch(clearUser());
    dispatch(setLogin(false));

    setShowLoginButton(true);
    setShowLogoutButton(false);
  };

  return (
    <div>
      {showLoginButton && (
        <GoogleLogin
          clientId={clientId}
          buttonText="Iniciar sesión con Google"
          onSuccess={onLoginSuccess}
          onFailure={onLoginFailure}
          cookiePolicy="single_host_origin"
          isSignedIn={true}
        />
      )}

      {showLogoutButton && (
        <GoogleLogout
          clientId={clientId}
          buttonText="Cerrar sesión"
          onLogoutSuccess={onSignoutSuccess}
        />
      )}
    </div>
  );
}

export default LoginOAuth;
