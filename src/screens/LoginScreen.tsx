import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';

export function LoginScreen() {
  const { login, register, requestPasswordReset, updatePassword, isPasswordRecovery } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { themeColors } = useApp();

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.primaryDark }]}>InstantA4</Text>
        <Text style={[styles.subtitle, { color: themeColors.muted }]}>
          {isPasswordRecovery
            ? 'Ingresa tu nueva contrasena.'
            : isResetMode
            ? 'Te enviaremos un link para recuperar tu contrasena.'
            : isRegisterMode
            ? 'Crea tu cuenta para empezar.'
            : 'Bienvenido. Inicia sesion para entrar.'}
        </Text>

        {isPasswordRecovery ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contrasena"
              placeholderTextColor={themeColors.muted}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar contrasena"
              placeholderTextColor={themeColors.muted}
              secureTextEntry
            />
          </>
        ) : isRegisterMode ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre completo"
              placeholderTextColor={themeColors.muted}
            />
            <TextInput
              style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Usuario"
              placeholderTextColor={themeColors.muted}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <TextInput
          style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Correo"
          placeholderTextColor={themeColors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isPasswordRecovery}
        />
        {!isPasswordRecovery && !isResetMode ? (
          <TextInput
            style={[styles.input, { borderColor: themeColors.border, color: themeColors.text, backgroundColor: themeColors.background }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor={themeColors.muted}
            secureTextEntry
          />
        ) : null}

        <Pressable
          style={[styles.button, { backgroundColor: loading ? themeColors.muted : themeColors.primary }]}
          disabled={loading || (isRegisterMode && cooldownSeconds > 0)}
          onPress={async () => {
            try {
              setLoading(true);
              if (isPasswordRecovery) {
                if (newPassword !== confirmPassword) {
                  Alert.alert('Contrasena no coincide', 'Asegurate de escribir la misma contrasena en ambos campos.');
                  return;
                }
                const result = await updatePassword(newPassword);
                if (!result.ok) {
                  Alert.alert('No se pudo actualizar', result.message);
                } else {
                  Alert.alert('Contrasena actualizada', result.message ?? 'Ya puedes iniciar sesion.');
                  setNewPassword('');
                  setConfirmPassword('');
                }
                return;
              }

              if (isResetMode) {
                const result = await requestPasswordReset(email);
                if (!result.ok) {
                  Alert.alert('No se pudo enviar', result.message);
                } else {
                  Alert.alert('Correo enviado', result.message ?? 'Revisa tu correo.');
                }
                return;
              }

              if (isRegisterMode) {
                const result = await register(email, password, username, fullName);
                if (!result.ok) {
                  Alert.alert('No se pudo registrar', result.message ?? 'Intenta de nuevo.');
                  if (/demasiados intentos|rate limit/i.test(result.message ?? '')) {
                    setCooldownSeconds(60);
                  }
                } else {
                  Alert.alert('Registro exitoso', result.message ?? 'Ya puedes iniciar sesion.');
                  setIsRegisterMode(false);
                  setPassword('');
                }
                return;
              }

              const result = await login(email, password);
              if (!result.ok) {
                Alert.alert('Datos invalidos', result.message ?? 'Revisa credenciales.');
              }
            } catch (error: any) {
              Alert.alert('Error inesperado', error?.message ?? 'Ocurrio un error no controlado.');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Procesando...'
              : isPasswordRecovery
              ? 'Guardar nueva contrasena'
              : isResetMode
              ? 'Enviar link de recuperacion'
              : isRegisterMode && cooldownSeconds > 0
              ? `Espera ${cooldownSeconds}s`
              : isRegisterMode
              ? 'Crear cuenta'
              : 'Entrar'}
          </Text>
        </Pressable>

        {!isPasswordRecovery ? (
          <>
            <Pressable
              onPress={() => {
                setIsRegisterMode((prev) => !prev);
                setIsResetMode(false);
                setPassword('');
                setEmail('');
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: themeColors.primaryDark }]}>
                {isRegisterMode ? 'Ya tengo cuenta' : 'No tengo cuenta, registrarme'}
              </Text>
            </Pressable>

            {!isRegisterMode ? (
              <Pressable
                onPress={() => {
                  setIsResetMode((prev) => !prev);
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: themeColors.primaryDark }]}>
                  {isResetMode ? 'Volver a inicio de sesion' : 'Olvide mi contrasena'}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonText: {
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 2,
  },
});
