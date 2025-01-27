import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import ShiftsScreen from './screens/ShiftsScreen';
import { View, Text } from 'react-native';

const Stack = createStackNavigator();

const DualColorHeader = () => (
  <View style={{ flexDirection: 'row', height: '100%' }}>
    <View style={{ backgroundColor: '#01843d', width: '30%', height: '100%' }} />
    <View style={{ backgroundColor: '#00a3df', width: '70%', height: '100%' }} />
  </View>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Auth"
          screenOptions={{
            header: ({ scene, previous, navigation }) => {
              if (scene.route.name === 'Auth') return null;
              return (
                <View style={{ height: 60 }}>
                  <DualColorHeader />
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 15,
                    justifyContent: 'space-between'
                  }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                      {scene.route.name}
                    </Text>
                  </View>
                </View>
              );
            }
          }}
        >
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
          />
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ 
              headerLeft: () => null,
              headerBackTitle: undefined
            }}
          />
          <Stack.Screen 
            name="Shifts" 
            component={ShiftsScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}