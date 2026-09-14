using System;
using System.Drawing;
using System.Windows.Forms;
using System.Diagnostics;
using System.Net.Sockets;

namespace VetPetPOS
{
    public class POSForm : Form
    {
        private WebBrowser browser;
        private ToolStrip toolStrip;
        private ToolStripStatusLabel statusLabel;
        private StatusStrip statusStrip;
        private string baseUrl = "http://localhost:3000";

        public POSForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "VetPet PK — Clinic & POS Reception System";
            this.Size = new Size(1280, 800);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.WindowState = FormWindowState.Maximized;
            this.KeyPreview = true;

            // ── Top Toolbar ────────────────────────────────────────────────────────
            toolStrip = new ToolStrip();
            toolStrip.GripStyle = ToolStripGripStyle.Hidden;
            toolStrip.BackColor = Color.FromArgb(13, 148, 136); // Teal #0D9488
            toolStrip.ForeColor = Color.White;
            toolStrip.Padding = new Padding(8, 6, 8, 6);
            toolStrip.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);

            // Brand label
            ToolStripLabel brandLabel = new ToolStripLabel("🐾 VetPet PK POS  |");
            brandLabel.ForeColor = Color.White;
            toolStrip.Items.Add(brandLabel);

            // POS Action Buttons
            AddNavButton("F1: New Invoice", "/dashboard/billing/create", Color.White);
            AddNavButton("F2: Live Queue", "/dashboard/appointments", Color.White);
            AddNavButton("F3: Search Pet", "/dashboard/pets", Color.White);
            AddNavButton("F4: Dashboard", "/dashboard", Color.White);
            AddNavButton("Billing & History", "/dashboard/billing", Color.White);
            AddNavButton("Inventory", "/dashboard/inventory", Color.White);

            toolStrip.Items.Add(new ToolStripSeparator());

            // Utility buttons
            ToolStripButton refreshBtn = new ToolStripButton("⟳ Refresh (F5)");
            refreshBtn.ForeColor = Color.White;
            refreshBtn.Click += (s, e) => browser.Refresh();
            toolStrip.Items.Add(refreshBtn);

            ToolStripButton printBtn = new ToolStripButton("🖨 Print (Ctrl+P)");
            printBtn.ForeColor = Color.White;
            printBtn.Click += (s, e) => browser.ShowPrintDialog();
            toolStrip.Items.Add(printBtn);

            ToolStripButton fullScreenBtn = new ToolStripButton("⛶ Fullscreen (F11)");
            fullScreenBtn.ForeColor = Color.White;
            fullScreenBtn.Click += (s, e) => ToggleFullScreen();
            toolStrip.Items.Add(fullScreenBtn);

            // ── Web Browser Control ────────────────────────────────────────────────
            browser = new WebBrowser();
            browser.Dock = DockStyle.Fill;
            browser.ScriptErrorsSuppressed = true;
            browser.IsWebBrowserContextMenuEnabled = true;

            browser.DocumentCompleted += (s, e) => {
                statusLabel.Text = "Ready — Connected to VetPet Server (" + browser.Url.ToString() + ")";
            };

            // ── Status Strip ───────────────────────────────────────────────────────
            statusStrip = new StatusStrip();
            statusLabel = new ToolStripStatusLabel("Connecting to VetPet POS server at " + baseUrl + "...");
            statusLabel.Font = new Font("Segoe UI", 9f);
            statusStrip.Items.Add(statusLabel);

            // Layout
            this.Controls.Add(browser);
            this.Controls.Add(toolStrip);
            this.Controls.Add(statusStrip);

            // Keyboard Shortcuts
            this.KeyDown += POSForm_KeyDown;

            // Load initial POS page
            NavigateTo("/dashboard/billing");
        }

        private void AddNavButton(string title, string path, Color textColor)
        {
            ToolStripButton btn = new ToolStripButton(title);
            btn.ForeColor = textColor;
            btn.Margin = new Padding(2, 0, 2, 0);
            btn.Click += (s, e) => NavigateTo(path);
            toolStrip.Items.Add(btn);
        }

        private void NavigateTo(string relativePath)
        {
            try
            {
                browser.Navigate(baseUrl + relativePath);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not connect to POS web server.\nPlease make sure 'npm run dev' is running in c:\\vet pet\\web\n\nError: " + ex.Message,
                    "Server Connection Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private bool isFullScreen = false;
        private FormWindowState prevWindowState;
        private FormBorderStyle prevBorderStyle;

        private void ToggleFullScreen()
        {
            if (!isFullScreen)
            {
                prevWindowState = this.WindowState;
                prevBorderStyle = this.FormBorderStyle;
                this.FormBorderStyle = FormBorderStyle.None;
                this.WindowState = FormWindowState.Maximized;
                isFullScreen = true;
            }
            else
            {
                this.FormBorderStyle = prevBorderStyle;
                this.WindowState = prevWindowState;
                isFullScreen = false;
            }
        }

        private void POSForm_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.F1) { NavigateTo("/dashboard/billing/create"); e.Handled = true; }
            else if (e.KeyCode == Keys.F2) { NavigateTo("/dashboard/appointments"); e.Handled = true; }
            else if (e.KeyCode == Keys.F3) { NavigateTo("/dashboard/pets"); e.Handled = true; }
            else if (e.KeyCode == Keys.F4) { NavigateTo("/dashboard"); e.Handled = true; }
            else if (e.KeyCode == Keys.F5) { browser.Refresh(); e.Handled = true; }
            else if (e.KeyCode == Keys.F11) { ToggleFullScreen(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.P) { browser.ShowPrintDialog(); e.Handled = true; }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new POSForm());
        }
    }
}
