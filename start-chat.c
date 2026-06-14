#include <windows.h>
#include <shlwapi.h>
#include <stdio.h>

#pragma comment(lib, "Shlwapi.lib")

int wmain(void)
{
    WCHAR exePath[MAX_PATH];
    WCHAR workingDir[MAX_PATH];
    WCHAR commandLine[MAX_PATH * 2];
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    // Récupère le chemin complet du binaire .exe
    if (!GetModuleFileNameW(NULL, exePath, MAX_PATH)) {
        fwprintf(stderr, L"Erreur: impossible de lire le chemin de l'exécutable.\n");
        return 1;
    }

    // Remplace le nom du fichier par le dossier contenant l'exécutable
    if (!PathRemoveFileSpecW(exePath)) {
        fwprintf(stderr, L"Erreur: impossible de récupérer le dossier de travail.\n");
        return 1;
    }

    wcscpy_s(workingDir, MAX_PATH, exePath);

    // Ligne de commande pour démarrer npm start
    // npm doit être installé et disponible dans le PATH de l'utilisateur
    wcscpy_s(commandLine, MAX_PATH * 2, L"npm.cmd start");

    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;

    ZeroMemory(&pi, sizeof(pi));

    // Crée le processus en arrière-plan sans ouvrir de console visible
    if (!CreateProcessW(
            NULL,
            commandLine,
            NULL,
            NULL,
            FALSE,
            CREATE_NO_WINDOW,
            NULL,
            workingDir,
            &si,
            &pi)) {
        fwprintf(stderr, L"Erreur: impossible de lancer npm start. Code erreur = %lu\n", GetLastError());
        return 1;
    }

    // Fermeture des handles du processus créé, sans attendre sa fin.
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    return 0;
}
