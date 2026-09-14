using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace VetPetPOS
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            string url = "http://localhost:3000/dashboard/billing";
            if (args.Length > 0) url = args[0];

            try
            {
                // Try launching native Chromium App window via Microsoft Edge (native on Windows 10 & 11)
                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
                }

                if (File.Exists(edgePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = edgePath;
                    psi.Arguments = string.Format("--app=\"{0}\" --window-size=1280,800 --start-maximized", url);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to default browser
                    Process.Start(url);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error launching VetPet POS Desktop App:\n" + ex.Message, "VetPet POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
