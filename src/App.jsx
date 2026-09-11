import React from 'react';
import 'antd/dist/antd.css';
import './index.css';
import NavContainer from './components/containers/NavContainer.jsx';
import ItemsContainer from './components/containers/ItemsContainer.jsx';
import LoginContainer from './components/containers/LoginContainer.jsx';

import { useSelector } from 'react-redux';

function App() {
  const isLoggedIn = useSelector(
    (state) => state.login.login
  );

  return (
    <div className="App">
      {!isLoggedIn && <LoginContainer />}

      {isLoggedIn && <NavContainer />}

      {isLoggedIn && <ItemsContainer />}
    </div>
  );
}

export default App;
