import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ModelProvider } from './contexts/ModelContext';
import Download from './screens/Download';
import Presentation from './screens/Presentation';
import GoogleAuthScreen from './screens/GoogleAuthScreen ';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <ModelProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Presentation">
            <Stack.Screen
              name="Download"
              options={{
                headerShown: false,
              }}
            >
              {({ navigation }) => (
                <Download
                  onDownloadComplete={() => {
                    console.log('✅ Model ready, going to Home...');
                    navigation.replace('Home');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Presentation"
              options={{
                headerShown: false,
              }}
              component={Presentation}
            />

            <Stack.Screen
              name="Home"
              options={{
                headerShown: false,
              }}
              component={Home}
            />
            <Stack.Screen
              name="Signin"
              options={{
                headerShown: false,
              }}
              component={GoogleAuthScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ModelProvider>
    </Provider>
  );
};

GoogleAuthScreen;

export default App;

// ✅ Navigation theme
{
  /**
  import Chat from './screens/Chat';
import History from './screens/History';
import Profile from './screens/Profile';
import Presentation from './screens/Presentation';
import Abuot from './screens/About';
import Download from './screens/Download';
import { store } from './redux/store';
import { Provider } from 'react-redux';
import { AdsProvider } from './contexts/adsContext';
import { ModelProvider } from './contexts/ModelContext';

const App = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <ModelProvider>
          <AdsProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Presentation"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#0F172A',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                  },
                  headerShadowVisible: false,
                  contentStyle: {
                    backgroundColor: '#0f172a',
                  },
                }}
              >
                <Stack.Screen
                  name="Presentation"
                  options={{
                    headerShown: false,
                  }}
                  component={Presentation}
                />

                <Stack.Screen
                  name="Download"
                  options={{
                    headerShown: false,
                  }}
                >
                  {({ navigation }) => (
                    <Download
                      onDownloadComplete={() => {
                        console.log('✅ Model ready, going to Home...');
                        navigation.replace('Home');
                      }}
                    />
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="Home"
                  options={{
                    headerShown: false,
                  }}
                  component={Home}
                />

                <Stack.Screen
                  name="About"
                  component={Abuot}
                  options={{
                    contentStyle: { backgroundColor: '#0f172a' },
                    headerStyle: { backgroundColor: '#1e293b' },
                  }}
                />

                <Stack.Screen name="Profile" component={Profile} />

                <Stack.Screen name="Chat" component={Chat} />

                <Stack.Screen
                  name="History"
                  options={{
                    title: 'History',
                  }}
                  component={History}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AdsProvider>
        </ModelProvider>
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
 */
}
