import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AdsProvider } from './contexts/adsContext'; // ← ekle

import Home from './screens/Home';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ModelProvider } from './contexts/ModelContext';
import Download from './screens/Download';
import Presentation from './screens/Presentation';
import GoogleAuthScreen from './screens/GoogleAuthScreen ';
import Chat from './screens/Chat';
import History from './screens/History';
import Abuot from './screens/About';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();

const App = () => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <Provider store={store}>
        <AdsProvider>
          <ModelProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Presentation"
                screenOptions={{
                  headerStyle: { backgroundColor: '#1e293b' },
                  headerTintColor: '#fff',
                  animation: 'none', // ← tüm geçiş animasyonlarını kapat

                  //  headerTitleStyle: { fontWeight: '700' },
                  // cardStyle: { backgroundColor: '#0f172a' }, // ← tüm ekranlar için
                }}
              >
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
                <Stack.Screen
                  name="History"
                  options={{
                    headerShown: false,
                  }}
                  component={History}
                />
                <Stack.Screen name="Chat" component={Chat} />
                <Stack.Screen
                  name="About"
                  component={Abuot}
                  options={{
                    contentStyle: { backgroundColor: '#0f172a' },
                    headerStyle: { backgroundColor: '#1e293b' },
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </ModelProvider>
        </AdsProvider>
      </Provider>
    </>
  );
};

export default App;
